/* Consent banner — gates Segment loading (Spain/AEPD: denied by default).
   The Segment write key is a public client-side value (like a GA measurement id), so it's
   baked in here directly — no build-time env vars. Analytics loads only on the production
   brand domains (never localhost / *.netlify.app deploy previews, so dev traffic stays out
   of the live ad-conversion data) and only after the visitor grants consent. qed.js forwards
   lead events server-side; consent.js fires the page view (analytics.page()) once the SDK
   is up.

   Consent is granular (Necessary / Functional / Analytics / Marketing), stored as a JSON
   object under "qed-consent". Only Analytics gates whether the Segment SDK loads at all —
   nothing (not even a page view) fires before that's granted. Marketing additionally gates
   which visitor identity gets attached server-side (see netlify/lib/forms.ts): hashed
   em/ph/name, IP, click-ids. Necessary is always granted and never sent to Segment.
   Functional is a first-party preference gate (language memory, dismissed notices — see
   i18n.js) and likewise never sent to Segment; it only decides whether we may persist those
   preference values.

   Analytics = measurement (is the site/campaign working — GA4, Meta/Google in reporting-only
   mode). Marketing = ad campaign optimization/targeting (full Meta Conversions API + Google
   Ads destinations, configured as Segment connections). Meta's Limited Data Use / Google's
   Restricted Data Processing belong on those "marketing" destinations once configured on the
   dashboard (see netlify/lib/forms.ts). */
(function () {
  "use strict";

  var KEY = "qed-consent";
  var WRITE_KEY = "WcDzJkXhvepcJqsfDdaEKFPv2uyjKafd";
  var PRIVACY_URL = "/privacy/";

  // Only measure on the real production domains — keeps localhost `netlify dev` and
  // *.netlify.app deploy previews out of the live analytics / ad-conversion data.
  function analyticsEnabled() {
    var h = location.hostname;
    return /(^|\.)quizeatdrink\.com$/.test(h) || /(^|\.)tardeodetrivia\.com$/.test(h);
  }

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  // { functional, analytics, marketing } | null (undecided). Migrates the legacy
  // 'granted'/'denied' string and the earlier {analytics,marketing} object (no functional).
  function loadCategories() {
    var raw = stored();
    if (raw == null) return null;
    if (raw === "granted") return { functional: true, analytics: true, marketing: true };
    if (raw === "denied") return { functional: false, analytics: false, marketing: false };
    try {
      var p = JSON.parse(raw);
      return {
        // Pre-functional consents never opted into functional storage — default it denied
        // (compliant). On branded production the language is fixed by brand anyway, so this
        // has no user-visible effect there; it just avoids assuming consent nobody gave.
        functional: !!p.functional,
        analytics: !!p.analytics,
        marketing: !!p.marketing
      };
    } catch (e) { return null; }
  }

  function saveCategories(c) { save(JSON.stringify(c)); }

  // Cross-domain consent: the language switcher (i18n.js) appends ?qedc=<stored value> when
  // moving between the two brand domains (separate origins → separate localStorage). Adopt it
  // here once — unless this domain already holds an explicit choice — then strip it from the URL
  // so it isn't shared onward or bookmarked.
  function importConsentFromUrl() {
    try {
      var url = new URL(location.href);
      if (!url.searchParams.has("qedc")) return;
      if (stored() == null) {
        var incoming = url.searchParams.get("qedc");
        var ok = incoming === "granted" || incoming === "denied";
        if (!ok) { try { ok = !!(incoming && JSON.parse(incoming)); } catch (e) {} }
        if (ok) save(incoming);
      }
      url.searchParams.delete("qedc");
      if (window.history && history.replaceState) {
        history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
    } catch (e) {}
  }
  importConsentFromUrl();

  var categories = loadCategories();
  applyCategories(categories);

  function applyCategories(cats) {
    window.__qedConsentCategories = cats ? assign({ necessary: true }, cats) : null;
    window.__qedConsent = cats && cats.analytics ? "granted" : "denied";
    // Functional gate read by i18n.js. When consent isn't applicable on this host (no banner
    // shown — local/preview), preferences are allowed so those environments keep working.
    window.__qedConsentActive = analyticsEnabled();
    window.__qedFunctional = cats ? !!cats.functional : !analyticsEnabled();
  }

  function assign(a, b) { for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) a[k] = b[k]; return a; }

  function loadSegment(cats) {
    if (!analyticsEnabled()) return;
    if (!cats.analytics) return; // strongest guarantee: don't even fetch the SDK
    if (window.__qedSegmentLoading) return;
    window.__qedSegmentLoading = true;

    /* Official Segment analytics.js (v1) snippet, invoked only after consent. Stubs
       window.analytics so queued page()/track() calls survive until the async SDK finishes
       loading, then flushes the queue. */
    !function () {
      var i = "analytics", analytics = window[i] = window[i] || [];
      if (!analytics.initialize) {
        if (analytics.invoked) {
          window.console && console.error && console.error("Segment snippet included twice.");
        } else {
          analytics.invoked = true;
          analytics.methods = ["trackSubmit", "trackClick", "trackLink", "trackForm", "pageview", "identify", "reset", "group", "track", "ready", "alias", "debug", "page", "screen", "once", "off", "on", "addSourceMiddleware", "addIntegrationMiddleware", "setAnonymousId", "addDestinationMiddleware", "register"];
          analytics.factory = function (e) {
            return function () {
              if (window[i].initialized) return window[i][e].apply(window[i], arguments);
              var n = Array.prototype.slice.call(arguments);
              if (["track", "screen", "alias", "group", "page", "identify"].indexOf(e) > -1) {
                var c = document.querySelector("link[rel='canonical']");
                n.push({ __t: "bpc", c: c && c.getAttribute("href") || undefined, p: location.pathname, u: location.href, s: location.search, t: document.title, r: document.referrer });
              }
              n.unshift(e);
              analytics.push(n);
              return analytics;
            };
          };
          for (var n = 0; n < analytics.methods.length; n++) {
            var key = analytics.methods[n];
            analytics[key] = analytics.factory(key);
          }
          analytics.load = function (key, n) {
            var t = document.createElement("script");
            t.type = "text/javascript";
            t.async = true;
            t.setAttribute("data-global-segment-analytics-key", i);
            t.src = "https://cdn.segment.com/analytics.js/v1/" + key + "/analytics.min.js";
            var r = document.getElementsByTagName("script")[0];
            r.parentNode.insertBefore(t, r);
            analytics._loadOptions = n;
          };
          analytics._writeKey = WRITE_KEY;
          analytics.SNIPPET_VERSION = "5.2.0";
          analytics.load(WRITE_KEY);
        }
      }
    }();

    // The snippet's own page() would fire a bare pageview — instead send one enriched call
    // (queued, flushed once the async SDK is ready). Schema matches the main site's own
    // conventions so both client- and server-side (netlify/lib/forms.ts) events roll up
    // together downstream: site/product/language use the same values and casing as the
    // server-side "Form Submitted" track calls.
    var pvSection = window.QED_SITE || "home";
    var pvLang = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    var PRODUCTS = {
      corporate: "corporate-event",
      celebrations: "celebration-event",
      venues: "venue-partnership",
      partners: "franchise-partnership"
    };
    var NAMES = {
      home: "Home", corporate: "Corporate", celebrations: "Celebrations",
      venues: "Venues", partners: "Partners", privacy: "Privacy", terms: "Terms"
    };
    window.analytics.page(NAMES[pvSection] || pvSection, {
      page_type: "landing",
      section: pvSection,
      language: pvLang,
      site: pvLang === "es" ? "tardeo-de-trivia" : "quiz-eat-drink",
      product: PRODUCTS[pvSection] || null
    });

    window.__qedSegmentReady = true;
  }

  if (categories) loadSegment(categories);

  function decide(cats) {
    categories = cats;
    saveCategories(cats);
    applyCategories(cats);
    loadSegment(cats);
    // Let consent-gated features (e.g. shared/brevo.js) react to a fresh grant on this page.
    try { window.dispatchEvent(new CustomEvent("qed:consentchange", { detail: cats })); } catch (e) {}
  }

  // force = reopened from the privacy page (window.QEDConsent.open) — shows the banner even
  // after a decision and even off the production domains, pre-filled with the current choice.
  function showBanner(force) {
    if (!force && !analyticsEnabled()) return; // nothing to measure off production domains
    if (!force && categories != null) return;  // already decided, on this or an earlier page
    var existing = document.querySelector(".consent");
    if (existing) { if (!force) return; existing.remove(); }

    var bar = document.createElement("div");
    bar.className = "consent";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Cookie consent");

    var msg = document.createElement("p");
    msg.className = "consent__msg";
    var msgText = document.createElement("span");
    msgText.setAttribute("data-i18n", "consent.msg");
    msgText.textContent = "We use a little data to understand what's working and to measure ad campaigns. No spam, no selling it on.";
    var more = document.createElement("a");
    more.className = "consent__more";
    more.href = PRIVACY_URL;
    more.setAttribute("data-i18n", "consent.more");
    more.textContent = "Learn more";

    var manage = document.createElement("button");
    manage.type = "button";
    manage.className = "consent__more consent__manage";
    var manageLabel = document.createElement("span");
    manageLabel.setAttribute("data-i18n", "consent.manage");
    manageLabel.textContent = "Manage";
    var saveLabel = document.createElement("span");
    saveLabel.className = "consent__save-label";
    saveLabel.setAttribute("data-i18n", "consent.save");
    saveLabel.textContent = "Save preferences";
    manage.appendChild(manageLabel);
    manage.appendChild(saveLabel);

    msg.appendChild(msgText);
    msg.appendChild(document.createTextNode(" "));
    msg.appendChild(more);
    msg.appendChild(document.createTextNode(" · "));
    msg.appendChild(manage);

    var cats = document.createElement("div");
    cats.className = "consent__categories";
    var catsIn = document.createElement("div");
    catsIn.className = "consent__categories__in";
    cats.appendChild(catsIn);

    var catDefs = [
      { id: "necessary", labelKey: "consent.cat.necessary", label: "Necessary", descKey: "consent.cat.necessaryd", desc: "Essential for the site to work and to remember this choice. Always on.", locked: true },
      { id: "functional", labelKey: "consent.cat.functional", label: "Functional", descKey: "consent.cat.functionald", desc: "Remembers your preferences (like language) and powers the live chat. Without them the site still works, but forgets you." },
      { id: "analytics", labelKey: "consent.cat.analytics", label: "Analytics", descKey: "consent.cat.analyticsd", desc: "Measurement: how the site and ad campaigns are performing (Segment, Meta, Google)." },
      { id: "marketing", labelKey: "consent.cat.marketing", label: "Marketing", descKey: "consent.cat.marketingd", desc: "Ad campaign optimization and targeting (Meta, Google)." }
    ];
    var checkboxes = {};
    catDefs.forEach(function (c) {
      var row = document.createElement("label");
      row.className = "consent__cat";
      var box = document.createElement("input");
      box.type = "checkbox";
      // Deny by default: on a first (undecided) visit, non-necessary boxes start UNCHECKED
      // so "Manage → Save" is an explicit opt-in. When reopened after a decision, reflect it.
      box.checked = c.locked ? true : (categories ? !!categories[c.id] : false);
      if (c.locked) { box.disabled = true; }
      else { box.setAttribute("data-cat", c.id); checkboxes[c.id] = box; }
      var text = document.createElement("span");
      var name = document.createElement("b");
      name.setAttribute("data-i18n", c.labelKey);
      name.textContent = c.label;
      var desc = document.createElement("small");
      desc.setAttribute("data-i18n", c.descKey);
      desc.textContent = c.desc;
      text.appendChild(name);
      text.appendChild(desc);
      row.appendChild(box);
      row.appendChild(text);
      catsIn.appendChild(row);
    });

    var actions = document.createElement("div");
    actions.className = "consent__actions";

    var reject = document.createElement("button");
    reject.type = "button";
    reject.className = "btn btn--sm consent__btn";
    reject.setAttribute("data-i18n", "consent.reject");
    reject.textContent = "Decline";

    var accept = document.createElement("button");
    accept.type = "button";
    accept.className = "btn btn--sm btn--cta consent__btn";
    accept.setAttribute("data-i18n", "consent.accept");
    accept.textContent = "Accept all";

    var open = false;
    function setOpen(v) {
      open = v;
      cats.classList.toggle("is-open", open);
      manage.classList.toggle("is-open", open);
    }
    manage.addEventListener("click", function () {
      if (!open) { setOpen(true); return; }
      setOpen(false);
      decide({ functional: checkboxes.functional.checked, analytics: checkboxes.analytics.checked, marketing: checkboxes.marketing.checked });
      bar.remove();
    });

    reject.addEventListener("click", function () {
      decide({ functional: false, analytics: false, marketing: false });
      bar.remove();
    });
    accept.addEventListener("click", function () {
      decide({ functional: true, analytics: true, marketing: true });
      bar.remove();
    });

    actions.appendChild(reject);
    actions.appendChild(accept);
    bar.appendChild(msg);
    bar.appendChild(cats);
    bar.appendChild(actions);
    document.body.appendChild(bar);

    if (force) setOpen(true); // reopened from the privacy page → show the toggles straight away

    if (window.QEDi18n) window.QEDi18n.apply(window.QEDi18n.current());
  }

  // Re-open the banner to review/update consent (wired to the button on /privacy/).
  window.QEDConsent = { open: function () { showBanner(true); } };

  // Defer the first-visit banner until the visitor scrolls (or a few seconds pass, for
  // anyone who never scrolls) instead of slapping it over the hero CTAs on load. Doesn't
  // affect the consent gate itself — nothing analytics-related loads until a real decision
  // is made either way, this just delays when the prompt appears.
  function deferredShow() {
    var shown = false;
    function trigger() {
      if (shown) return;
      shown = true;
      window.removeEventListener("scroll", trigger);
      clearTimeout(timer);
      showBanner(false);
    }
    window.addEventListener("scroll", trigger, { passive: true, once: true });
    var timer = setTimeout(trigger, 4000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", deferredShow);
  } else {
    deferredShow();
  }
})();
