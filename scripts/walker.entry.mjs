/* walkerOS entry — bundled by `npm run walker:build` (scripts/build-walker.mjs, esbuild) into
   shared/walker.js, the single vendored artifact the pages load. Integrated mode: this file IS
   the config. Replaces the hand-rolled Segment analytics.js snippet that used to live in
   shared/consent.js.

   Brand-agnostic on purpose: QED and TDT have SEPARATE Meta / Google Ads / Amplitude accounts,
   so no id is baked in here — every id is read at runtime from window.QED_CONFIG, which build.mjs
   regenerates per brand (per Netlify site) into config.js. One walker.js serves both brands.

   Inert-safe: a destination is only wired when its id is present in QED_CONFIG AND we're on a real
   production domain. So localhost / *.netlify.app previews and any brand whose ids aren't set yet
   send nothing — mirrors the old consent.js analyticsEnabled() gate and the "add credentials
   later" plan. Nothing sends before consent either: destinations declare their required consent
   category and the collector holds events until shared/consent.js pushes `elb('walker consent',…)`.

   Split (see MEASUREMENT-PLAN.md): this browser walker owns `page view` + engagement (Tier 2/3)
   and the redundant browser-side Meta Pixel / Google Ads events. The money events
   (`lead start` / `lead complete`) fire SERVER-side from the Netlify functions (Phase 3) — the
   Pixel `Lead` fired here shares the submission's event_id with the server CAPI event for dedup. */

import { startFlow } from "@walkeros/collector";
import { sourceBrowser } from "@walkeros/web-source-browser";
import { destinationMeta } from "@walkeros/web-destination-meta";
import { destinationGtag } from "@walkeros/web-destination-gtag";
import { destinationAPI } from "@walkeros/web-destination-api";

// Google Ads is CLIENT-side (gtag) with enhanced conversions for leads — simpler than the server
// API (no developer token / OAuth). It fires only the lead conversions (allowlisted below) and is
// the only client destination that consumes the lead events, so there's no double count: Amplitude
// ignores leads (sent server-side) and the Meta Pixel only forwards value/currency. PII for
// enhanced matching (email + name + city) rides in the lead event data under marketing consent and
// is read ONLY by this destination's enhancedConversions map; gtag hashes it before sending.

var cfg = (typeof window !== "undefined" && window.QED_CONFIG) || {};

// Mirror shared/consent.js analyticsEnabled(): only measure on the two real production domains,
// never localhost / *.netlify.app deploy previews — keeps dev traffic out of live ad/analytics.
function analyticsEnabled() {
  if (typeof location === "undefined") return false;
  var h = location.hostname;
  return /(^|\.)quizeatdrink\.com$/.test(h) || /(^|\.)tardeodetrivia\.com$/.test(h);
}
var LIVE = analyticsEnabled();

// Durable first-party pseudonymous id — the SAME localStorage key qed.js uses (externalId()),
// so the walker user, the server CAPI external_id, and the lead's _eid are one stable id per
// visitor. Seed it here on load so every event (incl. Amplitude, which requires a device_id) has
// an identity, and qed.js later reads the same value. Best-effort: no storage → undefined id.
function durableId() {
  try {
    var id = localStorage.getItem("qed-eid");
    if (!id) {
      id = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : Date.now() + "-" + Math.random().toString(16).slice(2);
      localStorage.setItem("qed-eid", id);
    }
    return id;
  } catch (e) { return undefined; }
}

// ---- globals: stamped on every event (walkerOS `globals`) ----
// Values + casing match the server side (netlify/lib/forms.ts) so both sources roll up together
// downstream (site/product/language identical). section = window.QED_SITE (the hub has none → home).
var PRODUCTS = {
  corporate: "corporate-event",
  celebrations: "celebration-event",
  venues: "venue-partnership",
  partners: "franchise-partnership",
};
var language = (typeof document !== "undefined" && (document.documentElement.getAttribute("lang") || "en").toLowerCase()) || "en";
var section = (typeof window !== "undefined" && window.QED_SITE) || "home";
var globals = {
  brand: cfg.brand || "DEV",
  site: language === "es" ? "tardeo-de-trivia" : "quiz-eat-drink",
  language: language,
  page_type: "landing",
  section: section,
  product: PRODUCTS[section] || null,
  env: LIVE ? "production" : "preview",
};

// ---- Amplitude (EU) via the generic API destination ----
// No first-party walkerOS Amplitude destination exists, so we POST Amplitude's HTTP V2 shape.
// When a rule sets no `data` map, the API destination hands the FULL walkerOS event to transform
// (web-destination-api: `f = isDefined(n) ? n : e`), so we build the whole payload from it here.
// Friendly, Title-Case Amplitude event names (the destination-matrix column in MEASUREMENT-PLAN);
// unknown events fall through to their raw "entity action" name.
var AMPLITUDE_NAMES = {
  "page view": "Page Viewed",
  "lead start": "Lead Started",
  "lead complete": "Lead Submitted",
  "form view": "Lead Form Viewed",
  "cta click": "CTA Clicked",
  "crosssell click": "Cross-sell Clicked",
  "faq open": "FAQ Opened",
  "scroll reach": "Scroll Depth Reached",
  "nav click": "Nav Clicked",
  "language switch": "Language Switched",
  "consent update": "Consent Updated",
  "outbound click": "Outbound Clicked",
};

// ---- Amplitude session ----
// Amplitude wants session_id = the session's start time in epoch ms (a number). walkerOS v4's
// browser source does not produce one (its `session: true` setting is a no-op in this bundle, and
// user.session would be a string anyway), so we keep Amplitude's own rule here: a session ends
// after 30 min without an event. Stored in localStorage so it spans the 7 pages and both form
// steps. `n` is the per-device event counter Amplitude uses as event_id. Only touched from the
// Amplitude transform (analytics consent already granted) or by qed.js under the same consent.
var SESSION_KEY = "qed-amp-session";
var SESSION_TIMEOUT_MS = 30 * 60 * 1000;
function touchSession(t) {
  t = t || Date.now();
  var s = null;
  try { s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) {}
  if (!s || typeof s.id !== "number" || t - (s.last || 0) > SESSION_TIMEOUT_MS) {
    s = { id: t, last: t, n: (s && s.n) || 0 };
  }
  s.last = Math.max(s.last || 0, t);
  s.n = (s.n || 0) + 1;
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {}
  return s;
}
// For qed.js: the server-side lead events land in the visitor's current browser session.
if (typeof window !== "undefined") {
  window.__qedAmpSession = function () {
    if (window.__qedConsent !== "granted") return undefined;
    return touchSession().id;
  };
}

function pagePath() {
  try { return location.pathname; } catch (e) { return undefined; }
}

function toAmplitudeEvent(event) {
  var user = event.user || {};
  // Real event time, not send time: page view queues until consent lands, and the session has to
  // be judged on when the visitor actually acted.
  var t = typeof event.timestamp === "number" ? event.timestamp : Date.now();
  var session = touchSession(t);
  var nav = typeof navigator !== "undefined" ? navigator : {};
  var amp = {
    event_type: AMPLITUDE_NAMES[event.name] || event.name,
    // device_id is required by Amplitude when user_id is absent (anonymous lead-gen). walker's
    // persistent device id, else the durable qed-eid (user.id), keeps a visitor's timeline stitched.
    device_id: user.device || user.id || undefined,
    session_id: session.id,
    event_id: session.n,
    insert_id: event.id, // Amplitude idempotency = walkerOS event id (same key as CAPI/Pixel dedup)
    time: t,
    platform: "Web",
    library: "walkeros-web/4",
    user_agent: nav.userAgent, // Amplitude parses this into OS / browser / device type
    language: nav.language,
    ip: "$remote", // geo (country/city) from the request IP. The IP is stored too unless the Amplitude project turns that off
    event_properties: Object.assign({ page_path: pagePath() }, event.globals, event.data),
  };
  return amp;
}

function amplitudeDestination() {
  if (!cfg.amplitudeKey) return null;
  return {
    code: destinationAPI,
    config: {
      consent: { analytics: true }, // measurement gate
      // Amplitude gets `page view` + all engagement, but NOT the lead events — those are sent
      // SERVER-side (hybrid split, MEASUREMENT-PLAN.md), so ignore them here to avoid double
      // counting a lead in Amplitude. Every other event passes through by default.
      mapping: { lead: { start: { ignore: true }, complete: { ignore: true } } },
      settings: {
        url: "https://api.eu.amplitude.com/2/httpapi", // EU data residency (decided)
        headers: { "Content-Type": "application/json" },
        transform: function (event) {
          return JSON.stringify({ api_key: cfg.amplitudeKey, events: [toAmplitudeEvent(event)] });
        },
      },
    },
  };
}

// ---- Meta Pixel (browser) ----
// Loads fbq (sets _fbp/_fbc) and fires exactly PageView + the redundant browser-side Lead. The
// server CAPI Lead (Phase 3) reuses the same event_id → Meta dedups the pair. Marketing-gated.
// loadScript: true is what actually loads fbevents.js. Without it the destination only
// installs the fbq queue stub and nothing ever leaves the browser. The destination inits only
// once marketing consent is granted, so the script never loads before that.
//
// Rule `data` must be { map: {...} }: walkerOS reads a bare { value: "data.value" } as a
// STATIC value and resolves it to the literal string "data.value", so the Lead went out with
// no value (verified against @walkeros/core 4.3.2 getMappingValue).
//
// walkerOS delivers ALL events to a destination by default (a mapping only shapes matched ones),
// so the `"*": { "*": { ignore: true } }` wildcard is an allowlist floor — without it every
// engagement event would fire as a noisy custom fbq event. The Meta destination sets
// fbq(..., { eventID: event.id }) automatically, and qed.js (Phase 2) pushes the lead event with
// id = the submission's _event_id, so the browser eventID == the server CAPI event_id (dedup).
function metaDestination() {
  if (!cfg.metaPixelId) return null;
  return {
    code: destinationMeta,
    config: {
      consent: { marketing: true },
      loadScript: true,
      settings: { pixelId: cfg.metaPixelId },
      mapping: {
        "*": { "*": { ignore: true } }, // allowlist floor — only the rules below reach the Pixel
        page: { view: {} }, // the Meta destination auto-maps "page view" → standard "PageView"
        lead: {
          // `lead complete` → standard Lead with value/currency. `lead start` intentionally stays
          // off the Pixel (it's a server-side secondary conversion only), so the wildcard drops it.
          complete: {
            settings: { track: "Lead" },
            data: { map: { value: "data.value", currency: "data.currency" } },
          },
        },
      },
    },
  };
}

// Meta's automatic configuration is on by default: once fbevents.js runs it sends button clicks
// (SubscribedButtonClick, with the button text) and page metadata by itself, outside the
// allowlist above, and with automatic advanced matching it can read the form's email and phone.
// Meta's switch is fbq('set', 'autoConfig', false, id) queued BEFORE fbq('init'). The destination
// (4.3.2) installs the fbq queue stub only when window.fbq is missing and never sets autoConfig,
// so install the same stub here first and queue the call: the destination then reuses this stub
// and its fbq('init') lands after it in the queue. Still nothing loads or sends before consent:
// the stub is an in-memory queue, and fbevents.js is only appended by the destination's init,
// which waits for marketing consent.
function disablePixelAutoConfig(pixelId) {
  if (!window.fbq) {
    var n = function () {
      if (n.callMethod) n.callMethod.apply(n, arguments);
      else n.queue.push(Array.prototype.slice.call(arguments));
    };
    n.queue = [];
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    window.fbq = n;
    if (!window._fbq) window._fbq = n;
  }
  window.fbq("set", "autoConfig", false, pixelId);
}

// ---- Google Ads (gtag, client-side) ----
// Loads the Google tag and fires the lead conversions with enhanced conversions for leads.
// Marketing-gated. Allowlist floor like the Pixel, so only the lead conversions fire (not the
// engagement events). Conversion value comes from data.value; the label per action from config.
// enhancedConversions maps email + name + city out of the (marketing-gated) lead event data — gtag
// hashes them before sending. Needs GOOGLE_ADS_CONVERSION_ID (AW-XXXX) + the two labels in config.
//
// Three things the gtag destination (4.3.2) needs that are easy to miss:
//   - loadScript: true, or gtag.js never loads (only the dataLayer stub runs).
//   - a truthy rule `name`: its push only sends an Ads conversion `if (ads.conversionId &&
//     rule.name)` (a TODO in the package), even when settings.ads.label is set. The label wins
//     over the name for send_to, so the name is just a switch. With no label configured the
//     name would become the label, so that rule is ignored instead.
//   - `data: { map: {...} }` (a bare { value: "data.value" } resolves to the literal string).
//     transaction_id = the walker event id (the submission's _event_id), Google's dedup key.
function adsLeadRule(label) {
  if (!label) return { ignore: true };
  return {
    name: "conversion",
    settings: { ads: { label: label } },
    data: { map: { value: "data.value", transaction_id: "id" } },
  };
}

function googleAdsDestination() {
  if (!cfg.googleAdsConversionId) return null;
  return {
    code: destinationGtag,
    config: {
      consent: { marketing: true },
      loadScript: true,
      settings: {
        ads: {
          conversionId: cfg.googleAdsConversionId,
          currency: "EUR",
          enhancedConversions: {
            email: "data.email",
            address: {
              first_name: "data.firstName",
              last_name: "data.lastName",
              city: "data.city",
            },
          },
        },
      },
      mapping: {
        "*": { "*": { ignore: true } }, // allowlist floor — only the lead conversions fire
        lead: {
          complete: adsLeadRule(cfg.googleAdsLabelComplete),
          start: adsLeadRule(cfg.googleAdsLabelStart),
        },
      },
    },
  };
}

// Local/preview debug destination — logs the events walker builds so `netlify dev` can verify
// event construction without sending anything (production-domain gate keeps real destinations off
// previews). Off entirely on production. Off unless QED_CONFIG.debug is truthy, so it's opt-in.
function debugDestination() {
  if (LIVE || !cfg.debug) return null;
  return {
    code: {
      type: "debug",
      config: {},
      push: function (event) {
        try { console.log("[walker]", event.name, event); } catch (e) {}
      },
    },
    config: {},
  };
}

function buildDestinations() {
  var out = {};
  var amp = amplitudeDestination();
  if (amp) out.amplitude = amp;
  if (LIVE) {
    var meta = metaDestination();
    if (meta) out.meta = meta;
    var gads = googleAdsDestination();
    if (gads) out.googleAds = gads;
  }
  var dbg = debugDestination();
  if (dbg) out.debug = dbg;
  return out;
}

// ---- consent handoff ----
// Decoupled from shared/consent.js: that file owns the banner + storage. We read a prior decision
// straight from localStorage and listen for live decisions via `qed:consentchange`, then push into
// walkerOS. Reading localStorage directly (NOT window.__qedConsentCategories) is deliberate: walker.js
// loads before consent.js, and this init runs in a microtask that can fire BEFORE consent.js's
// synchronous top-level — so __qedConsentCategories may still be undefined, but the persisted
// "qed-consent" value is already there from the prior visit. Getting this wrong meant returning
// visitors' consent never reached the collector and nothing ever sent. Until a decision exists,
// destinations hold their events (walkerOS queues per required category).
function pushConsent(elb, cats) {
  if (!cats) return;
  elb("walker consent", {
    functional: !!cats.functional,
    analytics: !!cats.analytics,
    marketing: !!cats.marketing,
  });
}

// The granular consent stored by consent.js ("qed-consent"), handling the same legacy formats it
// migrates. Returns {functional,analytics,marketing} or null (undecided).
function storedConsent() {
  try {
    var raw = localStorage.getItem("qed-consent");
    if (raw == null) return null;
    if (raw === "granted") return { functional: true, analytics: true, marketing: true };
    if (raw === "denied") return { functional: false, analytics: false, marketing: false };
    var p = JSON.parse(raw);
    return { functional: !!p.functional, analytics: !!p.analytics, marketing: !!p.marketing };
  } catch (e) { return null; }
}

// ---- start ----
// Exposes window.elb (push fn) + window.QEDWalker (collector). The browser source auto-fires
// `page view`; it (and every other event) stays queued until pushConsent releases the categories.
export async function initWalker() {
  if (typeof window === "undefined") return null;
  if (window.QEDWalker) return window.QEDWalker; // idempotent

  // Queue stub so any elb() call before startFlow resolves (e.g. an early lead event from qed.js)
  // is captured, then flushed into the real elb below — nothing fires into the void.
  if (!window.elb) {
    window.elb = function () { (window.elb.q = window.elb.q || []).push(arguments); };
  }
  var queued = (window.elb && window.elb.q) || [];

  if (LIVE && cfg.metaPixelId) disablePixelAutoConfig(cfg.metaPixelId);

  var eid = durableId();
  var flow = await startFlow({
    globals: globals,
    // device carries into Amplitude's device_id (required); id is the CAPI external_id match key.
    user: eid ? { id: eid, device: eid } : undefined,
    sources: {
      browser: {
        code: sourceBrowser,
        config: { settings: { pageview: true, session: true, elb: "elb" } },
      },
    },
    destinations: buildDestinations(),
  });

  window.elb = flow.elb;
  window.QEDWalker = flow.collector;
  queued.forEach(function (args) { try { flow.elb.apply(null, args); } catch (e) {} });

  // Apply a prior-visit decision straight from localStorage, then react to live banner decisions.
  // The re-check on the next macrotask covers the cross-domain case where consent.js imports a
  // ?qedc= value into localStorage during its own (later) run. Pushing the same consent twice is
  // harmless. No `consent update` event is emitted for these applies — only for a live decision
  // below — so returning visitors don't emit one on every page load.
  pushConsent(flow.elb, storedConsent());
  setTimeout(function () { pushConsent(flow.elb, storedConsent()); }, 0);
  window.addEventListener("qed:consentchange", function (e) {
    var cats = e && e.detail;
    pushConsent(flow.elb, cats);
    if (cats) {
      flow.elb("consent update", {
        functional: !!cats.functional,
        analytics: !!cats.analytics,
        marketing: !!cats.marketing,
      });
    }
  });

  return flow;
}

// Auto-init on load. Kept side-effecting so a plain <script src="/shared/walker.js"> is enough.
initWalker();
