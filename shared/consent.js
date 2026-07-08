/* Consent banner — gates RudderStack loading (Spain/AEPD: denied by default).
   The RudderStack write key + data plane URL are public client-side values (like a
   GA measurement id), so they are baked in here directly — no build-time env vars.
   Analytics loads only on the production brand domains (never localhost / *.netlify.app
   deploy previews, so dev traffic stays out of the live ad-conversion data) and only
   after the visitor grants consent. qed.js forwards lead events server-side; consent.js
   fires the page view (rudderanalytics.page()) once the SDK is up.

   Consent is granular (Necessary / Functional / Analytics / Marketing), stored as a JSON
   object under "qed-consent". Only Analytics + Marketing map to RudderStack (passed in the
   shape its custom consent manager expects: consentManagement { enabled, provider:"custom",
   allowedConsentIds, deniedConsentIds } on load(), the category ids doubling as keys). Those
   ids only actually gate destinations once matching Consent Categories are configured against
   each destination in the RudderStack dashboard — until then this is inert, like an unset env
   var. Necessary is always granted and never sent to RudderStack. Functional is a first-party
   preference gate (language memory, dismissed notices — see i18n.js) and likewise never sent
   to RudderStack; it only decides whether we may persist those preference values.

   Analytics = measurement (is the site/campaign working — GA4, Meta/Google in reporting-only
   mode). Marketing = ad campaign optimization/targeting (full Meta Conversions API + Google
   Ads destinations). Meta's Limited Data Use / Google's Restricted Data Processing belong on
   those "marketing" destinations once configured on the dashboard (see netlify/lib/forms.ts). */
(function () {
  "use strict";

  var KEY = "qed-consent";
  // "necessary" is implicit (always on). "functional" gates first-party preference storage
  // (see i18n.js) and is NOT sent to RudderStack. RS_CATEGORIES are the ones forwarded to
  // RudderStack's consent manager.
  var RS_CATEGORIES = ["analytics", "marketing"];
  var WRITE_KEY = "2e8anllkdUDI2MoK38sqseYAdMC";
  var DATA_PLANE_URL = "https://quizeatdricdmw.dataplane.rudderstack.com";
  // RudderStack v3 SDK, modern build (targets the evergreen browsers of the QED audience).
  var SDK_URL = "https://cdn.rudderlabs.com/v3/modern/rsa.min.js";
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

  // allowedConsentIds/deniedConsentIds per RudderStack's custom consent manager spec —
  // only Analytics + Marketing; Necessary/Functional are not gates on that side.
  function consentManagementFor(cats) {
    var allowed = [], denied = [];
    RS_CATEGORIES.forEach(function (id) { (cats[id] ? allowed : denied).push(id); });
    return { enabled: true, provider: "custom", allowedConsentIds: allowed, deniedConsentIds: denied };
  }

  function loadRudderstack(cats) {
    if (!analyticsEnabled()) return;
    if (!cats.analytics) return; // strongest guarantee: don't even fetch the SDK
    if (window.__qedRudderLoading) return;
    window.__qedRudderLoading = true;

    /* Official RudderStack JS SDK v3 loader, invoked only after consent. Stubs
       window.rudderanalytics so queued page()/track() calls survive until the async SDK
       finishes loading, then flushes the queue. */
    var e = "rudderanalytics";
    window[e] || (window[e] = []);
    var ra = window[e];
    if (Array.isArray(ra)) {
      if (ra.snippetExecuted === true) return;
      ra.snippetExecuted = true;
      var methods = ["setDefaultInstanceKey", "load", "ready", "page", "track", "identify", "alias", "group", "reset", "setAnonymousId", "startSession", "endSession", "consent", "addCustomIntegration"];
      for (var n = 0; n < methods.length; n++) {
        ra[methods[n]] = (function (m) {
          return function () {
            var i;
            Array.isArray(window[e])
              ? ra.push([m].concat(Array.prototype.slice.call(arguments)))
              : (i = window[e][m]) && i.apply(window[e], arguments);
          };
        })(methods[n]);
      }
      var s = document.createElement("script");
      s.src = SDK_URL;
      s.async = true;
      s.setAttribute("data-loader", "RS_JS_SDK");
      s.setAttribute("data-rsa-write-key", WRITE_KEY);
      var head = document.head || document.getElementsByTagName("head")[0];
      head.insertBefore(s, head.firstChild);
      ra.load(WRITE_KEY, DATA_PLANE_URL, { consentManagement: consentManagementFor(cats) });
      // v3 SDK does not auto-capture page views — fire one per load (queued, flushed on ready).
      ra.page();
    }

    window.__qedRudderReady = true;
  }

  if (categories) loadRudderstack(categories);

  function decide(cats) {
    categories = cats;
    saveCategories(cats);
    applyCategories(cats);
    loadRudderstack(cats);
    // Let consent-gated features (e.g. shared/brevo.js) react to a fresh grant on this page.
    try { window.dispatchEvent(new CustomEvent("qed:consentchange", { detail: cats })); } catch (e) {}
    // If the SDK is already up (preference changed via the reopened banner), update it live.
    try {
      if (window.rudderanalytics && window.rudderanalytics.consent) {
        window.rudderanalytics.consent({ consentManagement: consentManagementFor(cats) });
      }
    } catch (e) {}
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
    msg.appendChild(msgText);
    msg.appendChild(document.createTextNode(" "));
    msg.appendChild(more);

    var cats = document.createElement("div");
    cats.className = "consent__categories";
    var catsIn = document.createElement("div");
    catsIn.className = "consent__categories__in";
    cats.appendChild(catsIn);

    var catDefs = [
      { id: "necessary", labelKey: "consent.cat.necessary", label: "Necessary", descKey: "consent.cat.necessaryd", desc: "Essential for the site to work and to remember this choice. Always on.", locked: true },
      { id: "functional", labelKey: "consent.cat.functional", label: "Functional", descKey: "consent.cat.functionald", desc: "Remembers your preferences (like language) and powers the live chat. Without them the site still works, but forgets you." },
      { id: "analytics", labelKey: "consent.cat.analytics", label: "Analytics", descKey: "consent.cat.analyticsd", desc: "Measurement — how the site and ad campaigns are performing (RudderStack, Meta, Google)." },
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

    var manage = document.createElement("button");
    manage.type = "button";
    manage.className = "btn btn--sm consent__btn consent__manage";
    var manageLabel = document.createElement("span");
    manageLabel.setAttribute("data-i18n", "consent.manage");
    manageLabel.textContent = "Manage";
    var saveLabel = document.createElement("span");
    saveLabel.className = "consent__save-label";
    saveLabel.setAttribute("data-i18n", "consent.save");
    saveLabel.textContent = "Save preferences";
    manage.appendChild(manageLabel);
    manage.appendChild(saveLabel);

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
    actions.appendChild(manage);
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { showBanner(false); });
  } else {
    showBanner(false);
  }
})();
