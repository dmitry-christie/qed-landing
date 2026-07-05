/* Consent banner — gates RudderStack loading (Spain/AEPD: denied by default).
   The RudderStack write key + data plane URL are public client-side values (like a
   GA measurement id), so they are baked in here directly — no build-time env vars.
   Analytics loads only on the production brand domains (never localhost / *.netlify.app
   deploy previews, so dev traffic stays out of the live ad-conversion data) and only
   after the visitor grants consent. qed.js forwards lead events to window.rudderanalytics
   once window.__qedRudderReady is set.

   Consent is granular (Necessary / Analytics / Marketing), stored as a JSON object, and
   passed to RudderStack in the shape its custom consent manager expects: consentManagement
   { enabled, provider: "custom", allowedConsentIds, deniedConsentIds } on load(), with the
   category ids doubling as the object's keys. Those ids only actually gate destinations
   once matching Consent Categories are configured against each destination in the
   RudderStack dashboard — until then this is inert, like an unset env var (see build.mjs's
   RUDDERSTACK_CDN_URL note for the same class of issue). Necessary is always granted (the
   site can't remember your choice without it) and isn't sent to RudderStack at all — it
   gates nothing there. */
(function () {
  "use strict";

  var KEY = "qed-consent";
  var CATEGORIES = ["analytics", "marketing"]; // "necessary" is implicit, always-on, never denied
  var WRITE_KEY = "2e8anllkdUDI2MoK38sqseYAdMC";
  var DATA_PLANE_URL = "https://quizeatdricdmw.dataplane.rudderstack.com";
  // RudderStack v3 SDK. The "modern" build targets evergreen browsers (all of the
  // QED mobile audience); the official snippet's legacy-fallback probe used new
  // Function(), which we drop deliberately.
  var SDK_URL = "https://cdn.rudderlabs.com/v3/modern/rsa.min.js";

  // Only measure on the real production domains — keeps localhost `netlify dev` and
  // *.netlify.app deploy previews out of the live analytics / ad-conversion data.
  function analyticsEnabled() {
    var h = location.hostname;
    return /(^|\.)quizeatdrink\.com$/.test(h) || /(^|\.)tardeodetrivia\.com$/.test(h);
  }

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  // { analytics: bool, marketing: bool } | null (undecided). Migrates the old
  // 'granted' / 'denied' string this key used to hold before categories existed.
  function loadCategories() {
    var raw = stored();
    if (raw == null) return null;
    if (raw === "granted") return { analytics: true, marketing: true };
    if (raw === "denied") return { analytics: false, marketing: false };
    try {
      var parsed = JSON.parse(raw);
      return { analytics: !!parsed.analytics, marketing: !!parsed.marketing };
    } catch (e) { return null; }
  }

  function saveCategories(categories) { save(JSON.stringify(categories)); }

  var categories = loadCategories();
  applyCategories(categories);

  function applyCategories(cats) {
    window.__qedConsentCategories = cats ? assign({ necessary: true }, cats) : null;
    window.__qedConsent = cats && cats.analytics ? "granted" : "denied";
  }

  function assign(a, b) { for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) a[k] = b[k]; return a; }

  // allowedConsentIds/deniedConsentIds per RudderStack's custom consent manager spec —
  // "necessary" is never included, since it isn't a real gate on either side.
  function consentManagementFor(cats) {
    var allowed = [], denied = [];
    CATEGORIES.forEach(function (id) { (cats[id] ? allowed : denied).push(id); });
    return { enabled: true, provider: "custom", allowedConsentIds: allowed, deniedConsentIds: denied };
  }

  function loadRudderstack(cats) {
    if (!analyticsEnabled()) return;
    if (!cats.analytics) return; // strongest guarantee: don't even fetch the SDK
    if (window.__qedRudderLoading) return;
    window.__qedRudderLoading = true;

    /* Official RudderStack JS SDK v3 loader (from the source's Setup tab), invoked
       only after consent. Stubs window.rudderanalytics so queued track() calls survive
       until the async SDK finishes loading, then flushes the queue. */
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
    }

    window.__qedRudderReady = true;
  }

  if (categories) loadRudderstack(categories);

  function decide(cats) {
    categories = cats;
    saveCategories(cats);
    applyCategories(cats);
    loadRudderstack(cats);
    // Already-loaded SDK + a later preference change (re-opened banner isn't currently
    // reachable post-decision, but this keeps behavior correct if that's added later).
    try {
      if (window.rudderanalytics && window.rudderanalytics.consent) {
        window.rudderanalytics.consent({ consentManagement: consentManagementFor(cats) });
      }
    } catch (e) {}
  }

  function showBanner() {
    if (!analyticsEnabled()) return; // nothing to measure off the production domains
    if (categories != null) return; // already decided, on this or an earlier page
    if (document.querySelector(".consent")) return;

    var bar = document.createElement("div");
    bar.className = "consent";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Cookie consent");

    var msg = document.createElement("p");
    msg.className = "consent__msg";
    msg.setAttribute("data-i18n", "consent.msg");
    msg.textContent = "We use a little data to understand what's working and to measure ad campaigns. No spam, no selling it on.";

    var cats = document.createElement("div");
    cats.className = "consent__categories";
    cats.hidden = true;

    var catDefs = [
      { id: "necessary", labelKey: "consent.cat.necessary", label: "Necessary", descKey: "consent.cat.necessaryd", desc: "Remembers this choice. Always on.", locked: true },
      { id: "analytics", labelKey: "consent.cat.analytics", label: "Analytics", descKey: "consent.cat.analyticsd", desc: "Helps us see what's working (RudderStack)." },
      { id: "marketing", labelKey: "consent.cat.marketing", label: "Marketing", descKey: "consent.cat.marketingd", desc: "Ad campaign measurement (Meta, Google)." }
    ];
    var checkboxes = {};
    catDefs.forEach(function (c) {
      var row = document.createElement("label");
      row.className = "consent__cat";
      var box = document.createElement("input");
      box.type = "checkbox";
      box.checked = true;
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
      cats.appendChild(row);
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
    manage.addEventListener("click", function () {
      open = !open;
      cats.hidden = !open;
      manage.classList.toggle("is-open", open);
      if (open) return;
      decide({ analytics: checkboxes.analytics.checked, marketing: checkboxes.marketing.checked });
      bar.remove();
    });

    reject.addEventListener("click", function () {
      decide({ analytics: false, marketing: false });
      bar.remove();
    });
    accept.addEventListener("click", function () {
      decide({ analytics: true, marketing: true });
      bar.remove();
    });

    actions.appendChild(reject);
    actions.appendChild(manage);
    actions.appendChild(accept);
    bar.appendChild(msg);
    bar.appendChild(cats);
    bar.appendChild(actions);
    document.body.appendChild(bar);

    if (window.QEDi18n) window.QEDi18n.apply(window.QEDi18n.current());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showBanner);
  } else {
    showBanner();
  }
})();
