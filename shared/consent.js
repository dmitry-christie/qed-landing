/* Consent banner — gates RudderStack loading (Spain/AEPD: denied by default).
   The RudderStack write key + data plane URL are public client-side values (like a
   GA measurement id), so they are baked in here directly — no build-time env vars.
   Analytics loads only on the production brand domains (never localhost / *.netlify.app
   deploy previews, so dev traffic stays out of the live ad-conversion data) and only
   after the visitor grants consent. qed.js forwards lead events to window.rudderanalytics
   once window.__qedRudderReady is set. */
(function () {
  "use strict";

  var KEY = "qed-consent";
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

  var choice = stored(); // 'granted' | 'denied' | null (undecided)
  window.__qedConsent = choice === "granted" ? "granted" : "denied";

  function loadRudderstack() {
    if (!analyticsEnabled()) return;
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
      ra.load(WRITE_KEY, DATA_PLANE_URL, {});
    }

    window.__qedRudderReady = true;
  }

  if (choice === "granted") loadRudderstack();

  function showBanner() {
    if (!analyticsEnabled()) return; // nothing to measure off the production domains
    if (choice != null) return; // already decided, on this or an earlier page
    if (document.querySelector(".consent")) return;

    var bar = document.createElement("div");
    bar.className = "consent";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Cookie consent");

    var msg = document.createElement("p");
    msg.className = "consent__msg";
    msg.setAttribute("data-i18n", "consent.msg");
    msg.textContent = "We use a little data to understand what's working and to measure ad campaigns. No spam, no selling it on.";

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
    accept.textContent = "Accept";

    reject.addEventListener("click", function () {
      save("denied");
      window.__qedConsent = "denied";
      bar.remove();
    });
    accept.addEventListener("click", function () {
      save("granted");
      window.__qedConsent = "granted";
      loadRudderstack();
      bar.remove();
    });

    actions.appendChild(reject);
    actions.appendChild(accept);
    bar.appendChild(msg);
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
