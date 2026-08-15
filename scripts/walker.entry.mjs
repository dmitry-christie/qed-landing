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

var cfg = (typeof window !== "undefined" && window.QED_CONFIG) || {};

// Mirror shared/consent.js analyticsEnabled(): only measure on the two real production domains,
// never localhost / *.netlify.app deploy previews — keeps dev traffic out of live ad/analytics.
function analyticsEnabled() {
  if (typeof location === "undefined") return false;
  var h = location.hostname;
  return /(^|\.)quizeatdrink\.com$/.test(h) || /(^|\.)tardeodetrivia\.com$/.test(h);
}
var LIVE = analyticsEnabled();

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

function toAmplitudeEvent(event) {
  var user = event.user || {};
  var amp = {
    event_type: AMPLITUDE_NAMES[event.name] || event.name,
    // device_id is required by Amplitude when user_id is absent (anonymous lead-gen). walker's
    // persistent device id, else the durable qed-eid (user.id), keeps a visitor's timeline stitched.
    device_id: user.device || user.id || undefined,
    session_id: typeof user.session === "number" ? user.session : undefined,
    insert_id: event.id, // Amplitude idempotency = walkerOS event id (same key as CAPI/Pixel dedup)
    time: Date.now(),
    event_properties: Object.assign({}, event.globals, event.data),
  };
  return amp;
}

function amplitudeDestination() {
  if (!cfg.amplitudeKey) return null;
  return {
    code: destinationAPI,
    config: {
      consent: { analytics: true }, // measurement gate
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
// Sets _fbp/_fbc and fires PageView + the redundant browser-side Lead. The server CAPI Lead
// (Phase 3) reuses the same event_id → Meta dedups the pair. Marketing-gated.
// TODO(Phase 2): finalize `data` maps — Lead value/currency + eventID for CAPI dedup, and confirm
// how web-destination-meta threads eventID into fbq's {eventID} option.
function metaDestination() {
  if (!cfg.metaPixelId) return null;
  return {
    code: destinationMeta,
    config: {
      consent: { marketing: true },
      settings: { pixelId: cfg.metaPixelId },
      mapping: {
        page: { view: { name: "PageView" } },
        // `lead complete` on the browser side = Pixel Lead (dedup vs server CAPI by event_id).
        // `lead start` stays off the Pixel; it's a server-side secondary conversion only.
        lead: { complete: { name: "Lead" } },
      },
    },
  };
}

// ---- Google Ads (gtag) ----
// Browser-side conversion tag. Marketing-gated. Server-side enhanced conversions (Phase 3) are
// the higher-match-quality path; this is the on-page tag + gclid capture.
// TODO(Phase 2): wire enhancedConversions (hashed user_data) + confirm per-event label mapping.
function googleAdsDestination() {
  if (!cfg.googleAdsConversionId) return null;
  return {
    code: destinationGtag,
    config: {
      consent: { marketing: true },
      settings: { ads: { conversionId: cfg.googleAdsConversionId, currency: "EUR" } },
      mapping: {
        lead: {
          start: { settings: { ads: { label: cfg.googleAdsLabelStart } } },
          complete: { settings: { ads: { label: cfg.googleAdsLabelComplete } } },
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
    var ads = googleAdsDestination();
    if (ads) out.googleAds = ads;
  }
  var dbg = debugDestination();
  if (dbg) out.debug = dbg;
  return out;
}

// ---- start ----
// Exposes window.elb (push fn) + window.QEDWalker (collector). shared/consent.js (Phase 2) drives
// consent via elb('walker consent', {functional, analytics, marketing}); until then destinations
// hold their events. The browser source auto-fires `page view` (queued behind consent).
export async function initWalker() {
  if (typeof window === "undefined") return null;
  if (window.QEDWalker) return window.QEDWalker; // idempotent

  var flow = await startFlow({
    globals: globals,
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
  return flow;
}

// Auto-init on load. Kept side-effecting so a plain <script src="/shared/walker.js"> is enough.
initWalker();
