/* QED landing pages — progressive enhancement only.
   Mobile nav, scroll reveals, and the two-step lead forms that fetch() to the
   Netlify functions (book-event / franchise-apply / venue-apply) → Telegram. */
(function () {
  "use strict";

  // Timestamp this script started running — sent back as _t on submit so the server can
  // spot submissions that arrive faster than a human could plausibly fill the form (see
  // forms.ts MIN_FILL_MS). Complements the _honey field: a bot sophisticated enough to
  // render the page and skip the hidden honeypot input still has to either wait out this
  // clock or submit inhumanly fast.
  var PAGE_LOAD_TS = Date.now();

  /* footer year */
  var y = String(new Date().getFullYear());
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = y; });

  /* event-date pickers can't be in the past (junk leads to the founders' Telegram) */
  var now = new Date();
  var today = now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0");
  document.querySelectorAll("input[type=date]").forEach(function (el) {
    if (!el.min) el.min = today;
  });

  /* mobile nav */
  var toggle = document.querySelector(".nav__toggle");
  var links = document.querySelector(".nav__links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* scroll reveal + count-up stat numbers + map route draw-on — one observer, same trigger
     point for all three, so a section's numbers/arrows animate in sync with its fade-in.

     Count-up elements are authored with their real final value already in the HTML
     (e.g. <span data-count="125">125</span>) so a no-JS visitor sees the correct number
     immediately; only once JS confirms it can animate does it blank them to "0" up front,
     ready to count back up to the authored value when scrolled into view. */
  var reveals = document.querySelectorAll(".reveal");
  var counters = document.querySelectorAll("[data-count]");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); }

  /* Group thousands the way the current language does, so a four-figure counter lands on
     "6,700" in English and "6.700" in Spanish rather than the bare "6700" a raw Number gives
     you. useGrouping:"always" is deliberate — Spanish defaults to grouping only from five
     figures, but the brand writes "6.700+" (see the ES franchise one-pager), and a counter
     that disagrees with the printed collateral reads as a different number. Falls back to the
     raw number where Intl or the option is unavailable. */
  function formatCount(n) {
    try { return new Intl.NumberFormat(document.documentElement.lang || "en", { useGrouping: "always" }).format(n); }
    catch (e) { try { return n.toLocaleString(document.documentElement.lang || "en"); } catch (e2) { return String(n); } }
  }

  /* A counter's value can differ by language: ES is the TDT brand, which runs in fewer places
     than QED, so e.g. <div data-count="7" data-count-es="6"> reads 7 in English and 6 in
     Spanish. i18n.js sets <html lang> before this script runs and on every in-page toggle. */
  function countTarget(el) {
    var es = /^es/i.test(document.documentElement.lang || "") && el.hasAttribute("data-count-es");
    return parseInt(el.getAttribute(es ? "data-count-es" : "data-count"), 10);
  }

  // el.__qedCount: "pending" (blanked, waiting to scroll in), "running", "done". i18n.js leaves
  // a counter alone once this is set.
  function animateCount(el) {
    if (!isFinite(countTarget(el))) { el.__qedCount = "done"; return; }
    el.__qedCount = "running";
    var duration = 3000, start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      // Target read every frame, so a language toggle mid-count lands on the new value.
      var target = countTarget(el);
      if (isFinite(target)) el.textContent = formatCount(Math.round(easeOutCubic(p) * target));
      if (p < 1) requestAnimationFrame(tick);
      else el.__qedCount = "done";
    }
    requestAnimationFrame(tick);
  }

  function showFinalCount(el) {
    var n = countTarget(el);
    if (isFinite(n)) el.textContent = formatCount(n);
    el.__qedCount = "done";
  }

  // Draws each route arrow from Valencia outward as if being penned in, then crossfades
  // into the real (dotted, arrowhead-tipped) static path. Draws via a temporary solid
  // overlay rather than animating the original's stroke-dasharray directly, because the
  // original's dotted "0.5 9" pattern can't be smoothly interpolated from/to, and its
  // marker-end arrowhead would otherwise render at full opacity from frame one regardless
  // of dash progress — hiding the original until the overlay finishes sidesteps both.
  function animateMapArrows(arrows) {
    // Skip an arrow hidden for this language (data-lang-hide, e.g. Barcelona on the TDT site):
    // it has no rendered length to draw, and its clone would inherit the display:none anyway.
    // If the language flips back it simply shows in its finished, static state.
    arrows = Array.prototype.filter.call(arrows, function (path) { return path.style.display !== "none"; });
    arrows.forEach(function (path, i) {
      var len = path.getTotalLength();
      var overlay = path.cloneNode();
      overlay.removeAttribute("marker-end");
      overlay.setAttribute("class", "esmap__arrow-draw");
      overlay.style.strokeDasharray = len;
      overlay.style.strokeDashoffset = len;
      path.style.opacity = "0";
      path.parentNode.insertBefore(overlay, path.nextSibling);

      setTimeout(function () {
        var duration = Math.max(650, Math.min(1400, len * 4)), start = null;
        function tick(ts) {
          if (start === null) start = ts;
          var p = Math.min((ts - start) / duration, 1);
          overlay.style.strokeDashoffset = String(len * (1 - easeOutCubic(p)));
          if (p < 1) { requestAnimationFrame(tick); return; }
          path.style.transition = overlay.style.transition = "opacity .25s ease";
          path.style.opacity = "1";
          overlay.style.opacity = "0";
          setTimeout(function () { overlay.remove(); }, 260);
        }
        requestAnimationFrame(tick);
      }, i * 130);
    });
  }

  if (reveals.length || counters.length) {
    if ("IntersectionObserver" in window && !reduce) {
      counters.forEach(function (el) { el.textContent = "0"; el.__qedCount = "pending"; });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          if (e.target.hasAttribute("data-count")) {
            animateCount(e.target);
            return;
          }
          e.target.classList.add("in");
          var arrows = e.target.querySelectorAll(".esmap__arrow");
          if (arrows.length) animateMapArrows(arrows);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      reveals.forEach(function (el) { io.observe(el); });
      counters.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("in"); });
      // No count-up here, but still format the final value for the page language: the baked
      // English "7,510+" reads as 7.51 in Spanish. i18n.js has already set <html lang> by now.
      counters.forEach(showFinalCount);
    }
  }

  // In-page language toggle (unbranded/preview builds; branded ones navigate to the other
  // domain): a counter that already finished re-renders in the new language, both its value
  // (data-count-es) and its grouping (7,510 vs 7.510). A pending one still counts up to the
  // right value when it scrolls in, and a running one picks up the new target on its next frame.
  if (counters.length && "MutationObserver" in window) {
    new MutationObserver(function () {
      counters.forEach(function (el) { if (el.__qedCount === "done") showFinalCount(el); });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  /* FAQ accordions — native <details>, but height-animated (.ans already sets
     overflow:hidden). Toggling [open] directly instead of letting the browser's
     own click handling run first means it fires exactly once, in the right order. */
  if (!reduce) {
    document.querySelectorAll(".faq details").forEach(function (d) {
      var summary = d.querySelector("summary");
      var ans = d.querySelector(".ans");
      if (!summary || !ans) return;
      summary.addEventListener("click", function (ev) {
        ev.preventDefault();
        var opening = !d.open;
        if (opening) d.open = true;
        var target = opening ? ans.scrollHeight : 0;
        ans.style.height = (opening ? 0 : ans.scrollHeight) + "px";
        ans.getBoundingClientRect(); // force layout so the next line transitions from this value
        ans.style.transition = "height .32s cubic-bezier(.2,.7,.2,1)";
        ans.style.height = target + "px";
        ans.addEventListener("transitionend", function onEnd() {
          ans.removeEventListener("transitionend", onEnd);
          ans.style.transition = "";
          ans.style.height = "";
          if (!opening) d.open = false;
        });
      });
    });
  }

  /* window.__qed (lang/country) + analytics stubs (push to dataLayer; safe no-ops) */
  function assign(a, b) { for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) a[k] = b[k]; return a; }
  window.__qed = window.__qed || {};
  if (!window.__qed.country) window.__qed.country = "ES";
  function readCookie(name) {
    try {
      var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : "";
    } catch (e) { return ""; }
  }
  function pushDataLayer(name, detail) {
    try { (window.dataLayer = window.dataLayer || []).push(assign({ event: name }, detail || {})); } catch (e) {}
  }
  // Push an event into walkerOS (shared/walker.js). window.elb is a queuing stub until the async
  // collector finishes loading (walker.entry), so early calls aren't lost. Resilient by design —
  // a tracking failure must never break a form submit.
  function walkerPush(name, data, id) {
    try {
      if (!window.elb) return;
      window.elb(id ? { name: name, data: data || {}, id: id } : { name: name, data: data || {} });
    } catch (e) {}
  }

  // Expected lead value (EUR) for the browser lead events: the per-page defaults of
  // leadValue() in netlify/lib/forms.ts (deal size x assumed close rate; the reasoning lives
  // there). The franchise value really depends on the lead's city, which only the server
  // scores, so `lead complete` uses the value the step-2 response returns (the same number
  // the server CAPI Lead carries, so the deduped Pixel/CAPI pair agrees) and falls back to
  // the medium-city default here. `lead start` = 20% of the page default.
  var LEAD_VALUE = { corporate: 125, celebrations: 75, venues: 50, partners: 150 };
  var LEAD_START_SHARE = 0.2;
  function leadValue() { return LEAD_VALUE[window.QED_SITE] || LEAD_VALUE.venues; }
  function leadStartValue() { return Math.round(leadValue() * LEAD_START_SHARE); }

  // Identity for Google Ads enhanced conversions (client-side gtag) — attached to the lead events
  // ONLY under marketing consent, read only by the gtag destination's enhancedConversions map
  // (Amplitude ignores leads; the Meta Pixel only forwards value/currency), and hashed by gtag
  // before it reaches Google. `d` is the collected form snapshot.
  function leadIdentity(d) {
    var cats = window.__qedConsentCategories;
    if (!cats || !cats.marketing) return {};
    var id = {};
    if (d.email) id.email = d.email;
    if (d.firstName) id.firstName = d.firstName;
    if (d.lastName) id.lastName = d.lastName;
    if (d.city) id.city = d.city;
    return id;
  }

  // Lead funnel — two distinct events (entity-action, MEASUREMENT-PLAN.md), not one name split by
  // a `step` property, so a "Lead" conversion mapped to `lead complete` can never include
  // abandoners:
  //   `lead start`    = visitor cleared step 1 (name + email) — may not finish. SERVER-side only
  //                     (Amplitude + Meta CAPI secondary + Google), fired from the step-1 POST; the
  //                     browser Pixel and client Amplitude both ignore it.
  //   `lead complete` = the full lead. Fired SERVER-side (CAPI primary + Amplitude + Google) AND
  //                     here as the browser Pixel Lead, sharing the submission's _event_id so Meta
  //                     dedups the pair. step 1 and step 2 use different event ids (distinct
  //                     conversions, not a client/server pair to dedupe).
  // The pushDataLayer calls below are harmless GTM-parity leftovers (nothing consumes dataLayer).

  // RFC 4122 v4 shape even on the fallback path: the server only accepts a well-formed UUID as
  // a reminder id (_nudge), and uses these as event ids too.
  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }

  function postLead(action, data) {
    try {
      return fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        keepalive: true
      }).catch(function () {});
    } catch (e) { return Promise.resolve(); }
  }

  // How long a submit waits for step 1's request to finish (see the submit handler). Step 1's
  // function runs a few Brevo calls; this only bites when step 1 is still in flight at submit.
  var STEP1_WAIT_MS = 6000;

  // Resolves when `p` settles or after `ms`, whichever comes first. Never rejects.
  function settleWithin(p, ms) {
    return new Promise(function (resolve) {
      if (!p) { resolve(); return; }
      var t = setTimeout(resolve, ms);
      p.then(function () { clearTimeout(t); resolve(); }, function () { clearTimeout(t); resolve(); });
    });
  }

  /* ---------- consent replay for lead events ----------
     consent.js holds the first-visit banner back while a lead form is on screen, so a quick
     visitor often sends step 1, and sometimes step 2, before choosing. Those POSTs carry
     _consent "denied" and the function drops their walkerOS event (Meta CAPI + Amplitude, and
     Amplitude gets leads ONLY from the server). Nothing else can send them later, so keep each
     such payload in memory and, once the visitor grants analytics, POST it again marked
     _replay:"consent". The functions answer a replay with the analytics send alone (no
     Telegram, Brevo or portal), under the same _event_id, so Meta dedups it against the Pixel
     Lead that walkerOS releases from its own consent queue and Amplitude dedups on insert_id.
     Lost on navigation, like anything in memory: the banner shows right after a lead is sent. */
  var consentReplays = [];
  function queueConsentReplay(action, data) {
    if (data._consent === "granted") return;
    // A re-sent step 1 (corrected email) replaces the earlier one: same event id, so only the
    // first to arrive would count, and it should carry the corrected address.
    consentReplays = consentReplays.filter(function (r) { return !(r.data.form === data.form && r.data._step === data._step); });
    consentReplays.push({ action: action, data: data });
  }
  window.addEventListener("qed:consentchange", function () {
    if (window.__qedConsent !== "granted" || !consentReplays.length) return;
    var batch = consentReplays.splice(0);
    // Next tick, so walker.js has taken the decision first and the Amplitude session exists.
    setTimeout(function () {
      batch.forEach(function (r) {
        var d = assign({}, r.data);
        d._replay = "consent";
        d._consent = "granted";
        try { d._consentCategories = JSON.stringify(window.__qedConsentCategories || {}); } catch (e) {}
        try { var sid = window.__qedAmpSession && window.__qedAmpSession(); if (sid) d._sid = String(sid); } catch (e) {}
        var fp = readCookie("_fbp");
        if (fp) d._fbp = fp;
        postLead(r.action, d);
      });
    }, 0);
  });

  /* ---------- first-touch attribution ----------
     Capture ad click-ids + UTMs the moment the visitor lands, BEFORE any internal click
     strips them from the URL, so a "land → browse → submit" journey still carries the click
     that paid for it. First touch wins (30-day window). NOTHING is sent anywhere until the
     visitor grants analytics consent — the Netlify function drops any lead whose _consent
     isn't "granted" (and gates ad-match identifiers on the marketing category). This only
     persists attribution locally so it survives until the lead is submitted. */
  var ATTR_KEY = "qed-attr";
  var ATTR_TTL = 30 * 24 * 60 * 60 * 1000;
  var ATTR_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "wbraid", "gbraid", "fbclid", "msclkid", "ttclid"];

  function refHost() {
    try { return (document.referrer || "").replace(/^[a-z]+:\/\//i, "").split("/")[0] || ""; } catch (e) { return ""; }
  }

  function captureAttribution() {
    try {
      var params = new URLSearchParams(location.search);
      var found = {};
      ATTR_FIELDS.forEach(function (k) { var v = params.get(k); if (v) found[k] = v.slice(0, 512); });
      var existing = null;
      try { existing = JSON.parse(localStorage.getItem(ATTR_KEY) || "null"); } catch (e) {}
      var fresh = existing && existing.ts && (Date.now() - existing.ts < ATTR_TTL);
      // Our own follow-up emails (Brevo tags their links utm_source=sendinblue) are not a new
      // acquisition source: a lead finishing the form from the reminder must keep the ad or
      // organic touch that brought them, not be re-attributed to the email.
      var ownEmail = /^(sendinblue|brevo)$/i.test(found.utm_source || "") && !found.gclid && !found.wbraid && !found.gbraid && !found.fbclid;
      if (ownEmail && fresh) {
        // keep the existing record untouched
      } else if (Object.keys(found).length) {
        // A click param on the URL always overwrites, regardless of how fresh the stored
        // record is — last non-direct touch wins. Without this, a visitor who browsed
        // organically (or clicked a different ad) within the last 30 days would have this
        // new ad click silently swallowed and convert as "direct".
        found.ts = Date.now();
        found.ref = refHost();
        localStorage.setItem(ATTR_KEY, JSON.stringify(found));
      } else if (!fresh) {
        // No click params on this visit: only (re-)seed an organic/direct touch once the
        // existing record (organic or ad-click) has aged past the 30-day window — keeps
        // "first touch wins" for organic visits without clobbering a still-valid ad click.
        localStorage.setItem(ATTR_KEY, JSON.stringify({ ts: Date.now(), ref: refHost() }));
      }
    } catch (e) {}
  }
  captureAttribution();

  function storedAttr() {
    try { return JSON.parse(localStorage.getItem(ATTR_KEY) || "null") || {}; } catch (e) { return {}; }
  }

  // Durable first-party pseudonymous id — a non-PII match key (Meta CAPI external_id /
  // Google), stable across the two-step form and repeat visits. Raises ad match quality
  // without a browser Pixel. Forwarded server-side only under marketing consent.
  function externalId() {
    try {
      var id = localStorage.getItem("qed-eid");
      if (!id) { id = uuid(); localStorage.setItem("qed-eid", id); }
      return id;
    } catch (e) { return ""; }
  }

  // Meta click id: a real _fbc cookie, else the stored/URL fbclid (works with no Pixel
  // loaded). Uses the stored click timestamp when available, not "now".
  function fbc() {
    var v = readCookie("_fbc");
    if (v) return v;
    var attr = storedAttr();
    var fbclid = attr.fbclid || "";
    var ts = attr.ts;
    if (!fbclid) {
      var fm = location.search.match(/[?&]fbclid=([^&]+)/);
      if (fm) { fbclid = decodeURIComponent(fm[1]); ts = Date.now(); }
    }
    return fbclid ? ("fb.1." + (ts || Date.now()) + "." + fbclid) : "";
  }

  // Snapshot the whole form (both steps live in the DOM at once) + shared context fields.
  function collect(form, action, step, eventId) {
    var data = {};
    new FormData(form).forEach(function (v, k) { if (typeof v === "string") data[k] = v; });
    data.lang = (document.documentElement.getAttribute("lang") || "en").toUpperCase();
    data.country = window.__qed.country || "ES";
    var ccSel = form.querySelector("[data-role='phone-country']");
    var ccOpt = ccSel && ccSel.selectedOptions && ccSel.selectedOptions[0];
    if (ccOpt) data.phoneDial = ccOpt.getAttribute("data-dial") || "";
    data.form = form.getAttribute("name") || action;
    data.title = document.title;
    data.path = location.pathname;
    data.referrer = document.referrer || "$direct"; // convention for a direct visit (no referrer)
    data._step = String(step);
    data._event_id = eventId;
    data._url = location.href;
    data._consent = window.__qedConsent || "denied";
    if (window.__qedConsentCategories) { try { data._consentCategories = JSON.stringify(window.__qedConsentCategories); } catch (e) {} }
    var f = fbc();
    if (f) data._fbc = f;
    // _fbp is set by the Meta Pixel (loaded by walker under marketing consent). Read it live at
    // submit — freshest value, and a hidden field would predate Pixel init. Forwarded to CAPI.
    var fp = readCookie("_fbp");
    if (fp) data._fbp = fp;
    // first-touch attribution + durable pseudonymous id (forwarded only under consent)
    var attr = storedAttr();
    ATTR_FIELDS.forEach(function (k) { if (attr[k]) data["_" + k] = attr[k]; });
    if (attr.ref) data._ref = attr.ref;
    data._eid = externalId();
    // Amplitude session (walker.js, consent-gated there) so the server-side lead event joins the
    // visitor's browser session instead of landing as a session-less event.
    try { var sid = window.__qedAmpSession && window.__qedAmpSession(); if (sid) data._sid = String(sid); } catch (e) {}
    data._t = String(PAGE_LOAD_TS);
    return data;
  }

  /* lead forms — two-step + fetch() → Netlify function → Telegram (no page reload) */
  document.querySelectorAll("form[data-action]").forEach(function (form) {
    var action = form.getAttribute("data-action");
    var step1 = form.querySelector("[data-step='1']");
    var step2 = form.querySelector("[data-step='2']");
    var continueBtn = form.querySelector("[data-continue]");
    var backBtn = form.querySelector("[data-back]");
    var errEl = form.querySelector(".form-error");

    // Always shows the page's own localized, correctly-branded .form-error text (data-i18n
    // "form.generr" / "p.form.generr") — never the server's raw `error` string, which is
    // English-only and always names the QED inbox even on the Spanish/TDT site.
    function showError() {
      if (errEl) errEl.style.display = "block";
      else window.alert("Something went wrong.");
    }

    function focusFirst(scope) {
      var first = scope && scope.querySelector("input:not(.cselect__native), textarea, select:not(.cselect__native), .cselect__btn");
      if (!first) return;
      // Phone is step 2's first field: land on the number box, not its country-code dropdown.
      var tel = first.closest && first.closest(".tel-field");
      if (tel) first = tel.querySelector("[data-role='phone-number']") || first;
      if (reduce) first.focus(); else setTimeout(function () { first.focus(); }, 360);
    }

    /* phone: digit-filter as you type, loose format check before submit (optional field —
       an empty value is always valid). Spain (the primary market) gets an exact 9-digit
       rule; every other country gets a generic E.164-ish length range rather than a
       per-country table, since one wrong number just fails to reach the lead by phone,
       it's not a security boundary. */
    var phoneInput = form.querySelector("[data-role='phone-number']");
    var phoneCC = form.querySelector("[data-role='phone-country']");
    var phoneErr = form.querySelector("[data-role='phone-error']");

    function phoneDigits() {
      if (!phoneInput) return "";
      var digits = phoneInput.value.replace(/\D/g, "");
      // Autofill (and pasted numbers) often include the country's dial code, e.g. "+34 600
      // 123 456" for a 9-digit ES number — strip it so it doesn't get counted as part of
      // the national number.
      var dialOpt = phoneCC && phoneCC.selectedOptions && phoneCC.selectedOptions[0];
      var dial = dialOpt ? dialOpt.getAttribute("data-dial") : "";
      if (dial && digits.indexOf(dial) === 0) digits = digits.slice(dial.length);
      return digits;
    }
    function phoneValid() {
      var digits = phoneDigits();
      if (!digits) return true;
      var iso = phoneCC ? phoneCC.value : "ES";
      return iso === "ES" ? digits.length === 9 : (digits.length >= 7 && digits.length <= 14);
    }
    function setPhoneError(show) {
      if (!phoneErr || !phoneInput) return;
      phoneErr.style.display = show ? "block" : "none";
      phoneInput.setAttribute("aria-invalid", show ? "true" : "false");
    }

    /* email: the browser's own type=email check passes "juan@gmail" (no dot in the domain),
       which isEmail() in netlify/lib/forms.ts then rejects, so the lead would die with a 400 at
       step 2. Same shape check here, shown inline like the phone hint. The hint is created on
       first use (data-i18n "form.emailErr", Spanish from i18n-common.js) so the pages' HTML
       doesn't have to carry it. */
    var EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,24}$/;
    var EMAIL_ERR_EN = "Please check your email address (e.g. name@gmail.com).";
    var emailInput = form.querySelector("input[type='email']");
    var emailErr = null;

    function emailValid() {
      var v = emailInput ? emailInput.value.trim() : "";
      return !v || EMAIL_RE.test(v); // empty is the `required` check's job
    }
    function setEmailError(show) {
      if (!emailInput) return;
      if (show && !emailErr) {
        emailErr = document.createElement("p");
        emailErr.className = "field-error";
        emailErr.setAttribute("role", "alert");
        emailErr.setAttribute("data-i18n", "form.emailErr");
        emailErr.id = (emailInput.id || "email") + "-err";
        emailErr.__en = EMAIL_ERR_EN; // i18n.js's English fallback when the language flips
        var lang = window.QEDi18n ? window.QEDi18n.current() : "EN";
        emailErr.textContent = (lang === "ES" && window.QED_ES && window.QED_ES["form.emailErr"] != null) ? window.QED_ES["form.emailErr"] : EMAIL_ERR_EN;
        emailInput.insertAdjacentElement("afterend", emailErr);
      }
      if (emailErr) emailErr.style.display = show ? "block" : "none";
      emailInput.setAttribute("aria-invalid", show ? "true" : "false");
      // Point at the hint only while it shows: a screen reader reads an aria-describedby target
      // even when it's hidden, so a fixed address would still be announced as wrong.
      if (show && emailErr) emailInput.setAttribute("aria-describedby", emailErr.id);
      else emailInput.removeAttribute("aria-describedby");
    }

    if (emailInput) {
      emailInput.addEventListener("input", function () {
        if (emailErr && emailErr.style.display === "block" && emailValid()) setEmailError(false);
      });
      emailInput.addEventListener("blur", function () { if (!emailValid()) setEmailError(true); });
    }

    if (phoneInput) {
      phoneInput.addEventListener("input", function () {
        var v = phoneInput.value.replace(/[^\d +]/g, "");
        if (v !== phoneInput.value) phoneInput.value = v;
        if (phoneErr && phoneErr.style.display === "block" && phoneValid()) setPhoneError(false);
      });
      phoneInput.addEventListener("blur", function () { setPhoneError(!phoneValid()); });
      if (phoneCC) phoneCC.addEventListener("change", function () { if (phoneErr && phoneErr.style.display === "block") setPhoneError(!phoneValid()); });
    }

    /* step 1 → step 2: validate required fields, fire the partial "Lead Started" (step 1),
       then hand off to step 2 (CSS crossfades/collapses — see .at-step2 rules in qed.css) */
    if (continueBtn && step2) {
      continueBtn.addEventListener("click", function () {
        var scope = step1 || form;
        var invalid = null;
        scope.querySelectorAll("input,select,textarea").forEach(function (el) {
          if (el.required && !el.checkValidity() && !invalid) invalid = el;
        });
        if (invalid) {
          if (invalid.__csOpen) { invalid.__cselectBtn.focus(); invalid.__csOpen(); }
          else if (invalid.reportValidity) invalid.reportValidity();
          else invalid.focus();
          return;
        }
        if (emailInput && scope.contains(emailInput) && !emailValid()) {
          setEmailError(true);
          emailInput.focus();
          return;
        }
        form.classList.add("at-step2");
        // Step 1 goes out once, and again only if the email changed since (Back, fix a typo,
        // Continue): otherwise the reminder would go to the mistyped address and the corrected
        // one would never be saved as a partial.
        var email1 = emailInput ? emailInput.value.trim().toLowerCase() : "";
        if (!form.__step1Sent || email1 !== form.__step1Email) {
          var firstSend = !form.__step1Sent;
          form.__step1Sent = true;
          form.__step1Email = email1;
          // A re-send keeps the first send's event id, so Meta and Amplitude dedup it: one
          // `lead start` per form, however many times the address is corrected.
          if (firstSend) form.__step1EventId = uuid();
          var d1 = collect(form, action, 1, form.__step1EventId);
          // Id of the one reminder email this step 1 schedules (the server uses it as Brevo's
          // batchId). Step 2 sends it back to cancel that reminder directly, and a re-send
          // cancels the one scheduled for the previous address.
          if (form.__nudge) d1._nudgeCancel = form.__nudge;
          form.__nudge = uuid();
          d1._nudge = form.__nudge;
          if (firstSend) {
            var et = form.elements.eventType;
            pushDataLayer("Lead Started", { step: 1, form: d1.form, eventType: et ? et.value : undefined, event_id: d1._event_id });
            // Client-side Google Ads secondary conversion (gtag). Only the gtag destination consumes
            // a client `lead start` — the Pixel and Amplitude both ignore it. id = this step's
            // _event_id (distinct from step 2's, they're separate conversions).
            walkerPush("lead start", assign({ funnel: window.QED_SITE || "home", value: leadStartValue(), currency: "EUR" }, leadIdentity(d1)), d1._event_id);
          }
          // fire-and-forget: partial lead → server (walkerOS `lead start`, a short "not finished"
          // Telegram ping, Brevo contact + one reminder email in 2h that step 2 cancels). Never
          // blocks the UI; submit waits for it (briefly) so step 2 can't overtake it.
          form.__step1Promise = postLead(action, d1);
          queueConsentReplay(action, d1);
        }
        focusFirst(step2);
      });
    }

    /* step 2 → step 1: come back to edit, values untouched (nothing left the DOM) */
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        form.classList.remove("at-step2");
        focusFirst(step1);
      });
    }

    /* submit → POST the full lead (step 2) to the function */
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();

      // Enter / mobile-keyboard "Go" from a step-1 field fires implicit submission even
      // though the only type=submit lives in the (collapsed) step 2 — route it to Continue
      // so step 1 validates and fires its partial event, instead of POSTing a half-empty
      // "full" lead that skips qualification.
      if (step2 && continueBtn && !form.classList.contains("at-step2")) {
        continueBtn.click();
        return;
      }

      var btn = form.querySelector("[type=submit]");
      var btnLabel = btn ? btn.querySelector("[data-i18n]") : null;
      var btnLabelText = btnLabel ? btnLabel.textContent : null;
      if (errEl) errEl.style.display = "none";

      // Forms are novalidate — this handler is the only submit-time gate. Enforce required
      // fields (mirrors the Continue handler) before touching the network or tracking.
      var invalid = null;
      form.querySelectorAll("input,select,textarea").forEach(function (el) {
        if (el.required && !el.checkValidity() && !invalid) invalid = el;
      });
      if (invalid) {
        if (invalid.__csOpen) { invalid.__cselectBtn.focus(); invalid.__csOpen(); }
        else if (invalid.reportValidity) invalid.reportValidity();
        else invalid.focus();
        return;
      }
      // Same email shape check as Continue (the server would 400 it). The field lives in step 1,
      // so bring that step back into view first.
      if (emailInput && !emailValid()) {
        form.classList.remove("at-step2");
        setEmailError(true);
        emailInput.focus();
        return;
      }

      // Phone is optional — an invalid-looking number shows the inline hint but never
      // blocks submission of an otherwise-valid lead.
      if (phoneInput) setPhoneError(!phoneValid());

      var data = collect(form, action, 2, uuid());
      if (form.__nudge) data._nudge = form.__nudge; // the reminder step 1 scheduled: cancel it

      if (btn) {
        btn.disabled = true;
        if (btnLabel) {
          var lang = window.QEDi18n ? window.QEDi18n.current() : "EN";
          btnLabel.textContent = (lang === "ES" && window.QED_ES["form.sending"] != null) ? window.QED_ES["form.sending"] : "Sending…";
        }
      }

      // Let step 1's request finish first (capped): a double Enter, or a quick Submit (every step-2
      // field is optional), would otherwise reach the server while step 1 is still saving the
      // contact and scheduling its reminder, and step 2 would miss both.
      settleWithin(form.__step1Promise, STEP1_WAIT_MS).then(function () {
        return fetch(action, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      }).then(function (r) {
        return r.text().then(function (t) {
          var j = {}; try { j = JSON.parse(t); } catch (e) {}
          return { ok: r.ok, body: j };
        });
      }).then(function (res) {
        // The server's `error` string (validation/server-error text) is for logging only —
        // it's English-only and hardcodes the QED inbox, so it must never reach the UI on
        // the Spanish/TDT site. The visible message is always the page's own localized
        // .form-error text, shown as-is by showError().
        if (!(res.ok && res.body && res.body.ok)) {
          throw new Error((res.body && res.body.error) || "Server returned an error response.");
        }
        form.classList.add("sent");
        queueConsentReplay(action, data);
        var s = form.querySelector(".form-success");
        if (s) { s.setAttribute("role", "status"); if (s.focus) s.focus(); }
        pushDataLayer("Form Submitted", { step: 2, form: data.form, event_id: data._event_id });
        // Browser-side Meta Pixel Lead — id = the submission's _event_id so it dedups against the
        // server CAPI Lead (netlify/lib/forms.ts). Amplitude ignores this client lead (the server
        // sends it); only the Pixel consumes it, for value/currency + the _fbp/_fbc match.
        var serverValue = res.body.value;
        var value = (typeof serverValue === "number" && isFinite(serverValue)) ? serverValue : leadValue();
        walkerPush("lead complete", assign({ funnel: window.QED_SITE || "home", value: value, currency: "EUR" }, leadIdentity(data)), data._event_id);
        form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
        // consent.js holds the first-visit banner back while a lead form is on screen; a sent
        // lead is its cue to show it.
        try { window.dispatchEvent(new CustomEvent("qed:leadsent")); } catch (e) {}
      }).catch(function (err) {
        if (btn) {
          btn.disabled = false;
          if (btnLabel) btnLabel.textContent = btnLabelText;
        }
        if (window.console && console.error) console.error("Form submit failed:", err);
        showError();
      });
    });
  });

  /* ---------- custom dropdowns ----------
     Native <select> can't be styled once open, so we enhance each into a styled listbox
     (progressive enhancement — the native select stays in the DOM, keeps the value, and
     still submits + validates; if this code never runs the form works exactly as before). */
  function buildCustomSelect(sel) {
    var wrap = document.createElement("div");
    wrap.className = "cselect";
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add("cselect__native");
    sel.setAttribute("tabindex", "-1");
    sel.setAttribute("aria-hidden", "true");

    var labelText = "";
    if (sel.id) { var lab = document.querySelector('label[for="' + sel.id + '"]'); if (lab) labelText = lab.textContent.trim(); }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cselect__btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    if (labelText) btn.setAttribute("aria-label", labelText);
    var labelSpan = document.createElement("span");
    labelSpan.className = "cselect__value";
    var chev = document.createElement("span");   // chevron drawn in CSS (see .cselect__chev)
    chev.className = "cselect__chev";
    chev.setAttribute("aria-hidden", "true");
    btn.appendChild(labelSpan);
    btn.appendChild(chev);
    wrap.appendChild(btn);

    var list = document.createElement("ul");
    list.className = "cselect__list";
    list.setAttribute("role", "listbox");
    if (labelText) list.setAttribute("aria-label", labelText);
    var listId = (sel.id || "cs-" + Math.random().toString(16).slice(2)) + "-list";
    list.id = listId;
    btn.setAttribute("aria-controls", listId);
    wrap.appendChild(list);

    var activeIndex = -1;
    function opts() { return Array.prototype.slice.call(sel.options); }

    function renderList() {
      list.textContent = "";
      opts().forEach(function (opt, i) {
        var li = document.createElement("li");
        li.className = "cselect__opt";
        li.setAttribute("role", "option");
        li.id = listId + "-" + i;
        li.textContent = opt.textContent;
        li.setAttribute("aria-selected", opt.selected ? "true" : "false");
        if (opt.selected) li.classList.add("is-selected");
        if (opt.disabled) li.setAttribute("aria-disabled", "true");
        li.addEventListener("click", function () { choose(i); });
        list.appendChild(li);
      });
    }

    function syncValue() {
      var opt = sel.options[sel.selectedIndex] || sel.options[0];
      labelSpan.textContent = opt ? opt.textContent : "";
      btn.classList.toggle("is-placeholder", !!opt && opt.value === "");
    }

    function refresh() { renderList(); syncValue(); }

    function setActive(i) {
      var items = list.children;
      if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].classList.remove("is-active");
      activeIndex = i;
      if (i >= 0 && items[i]) {
        items[i].classList.add("is-active");
        btn.setAttribute("aria-activedescendant", items[i].id);
        items[i].scrollIntoView({ block: "nearest" });
      } else {
        btn.removeAttribute("aria-activedescendant");
      }
    }

    function onDocClick(e) { if (!wrap.contains(e.target)) close(); }

    // The list is position:fixed so it escapes the form's overflow:hidden clipping (the
    // step-collapse animation containers + the split card). Anchor it to the button and
    // flip above when there isn't room below.
    function positionList() {
      var r = btn.getBoundingClientRect();
      list.style.width = r.width + "px";
      list.style.left = r.left + "px";
      var lh = list.offsetHeight;
      var below = window.innerHeight - r.bottom;
      if (below < lh + 12 && r.top > below) {
        list.style.top = "auto";
        list.style.bottom = (window.innerHeight - r.top + 6) + "px";
      } else {
        list.style.bottom = "auto";
        list.style.top = (r.bottom + 6) + "px";
      }
    }
    function reposition() { if (wrap.classList.contains("is-open")) positionList(); }

    function open() {
      if (wrap.classList.contains("is-open")) return;
      renderList();
      wrap.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      positionList();
      setActive(sel.selectedIndex >= 0 ? sel.selectedIndex : 0);
      document.addEventListener("click", onDocClick, true);
      window.addEventListener("scroll", reposition, true);
      window.addEventListener("resize", reposition);
    }
    function close() {
      if (!wrap.classList.contains("is-open")) return;
      wrap.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      setActive(-1);
      document.removeEventListener("click", onDocClick, true);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    }
    function choose(i) {
      if (i < 0 || i >= sel.options.length || sel.options[i].disabled) return;
      sel.selectedIndex = i;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      syncValue();
      Array.prototype.forEach.call(list.children, function (li, idx) {
        li.setAttribute("aria-selected", idx === i ? "true" : "false");
        li.classList.toggle("is-selected", idx === i);
      });
      close();
      btn.focus();
    }

    btn.addEventListener("click", function () { wrap.classList.contains("is-open") ? close() : open(); });
    btn.addEventListener("keydown", function (e) {
      var isOpen = wrap.classList.contains("is-open");
      switch (e.key) {
        case "ArrowDown": e.preventDefault(); isOpen ? setActive(Math.min(activeIndex + 1, sel.options.length - 1)) : open(); break;
        case "ArrowUp": e.preventDefault(); isOpen ? setActive(Math.max(activeIndex - 1, 0)) : open(); break;
        case "Home": if (isOpen) { e.preventDefault(); setActive(0); } break;
        case "End": if (isOpen) { e.preventDefault(); setActive(sel.options.length - 1); } break;
        case "Enter": case " ": case "Spacebar": e.preventDefault(); isOpen ? choose(activeIndex) : open(); break;
        case "Escape": if (isOpen) { e.preventDefault(); close(); } break;
        case "Tab": if (isOpen) close(); break;
        default: if (e.key && e.key.length === 1) typeahead(e.key);
      }
    });

    var typeBuf = "", typeTimer = null;
    function typeahead(ch) {
      if (!wrap.classList.contains("is-open")) open();
      typeBuf += ch.toLowerCase();
      clearTimeout(typeTimer); typeTimer = setTimeout(function () { typeBuf = ""; }, 700);
      var o = opts();
      for (var i = 0; i < o.length; i++) { if (o[i].textContent.toLowerCase().indexOf(typeBuf) === 0) { setActive(i); return; } }
    }

    // native option text changes (i18n language swap) → refresh labels
    if ("MutationObserver" in window) {
      new MutationObserver(function () { refresh(); }).observe(sel, { childList: true, subtree: true, characterData: true });
    }
    sel.addEventListener("change", syncValue);

    sel.__cselect = wrap;
    sel.__cselectBtn = btn;
    sel.__csOpen = open;
    refresh();
  }

  function enhanceSelects() {
    document.querySelectorAll("select.input").forEach(function (sel) {
      if (sel.__enhanced) return;
      sel.__enhanced = true;
      try { buildCustomSelect(sel); } catch (e) { sel.classList.remove("cselect__native"); }
    });
  }

  /* ---------- phone country/dial-code selectors ----------
     select[data-role="phone-country"] ships in the HTML with a single "Spain" <option>
     (works with no JS). Here we fill it from shared/phone-countries.js (name + dial code,
     localized) — Spain first since it's the home market, the rest A-Z. It's still a plain
     select.input, so enhanceSelects() above wraps it into the same custom dropdown as
     every other select. A MutationObserver on <html lang> re-labels the options in place
     if the visitor flips language in-page (local/preview builds — branded deploys navigate
     to the other domain instead, see i18n.js switchLang). */
  function countryLabel(c, lang) { return (lang === "ES" ? c.es : c.en) + " +" + c.dial; }

  function populatePhoneCountrySelects() {
    var all = window.QED_COUNTRIES || [];
    if (!all.length) return;
    var lang = (document.documentElement.getAttribute("lang") || "en").toUpperCase();
    var es = null;
    var rest = [];
    all.forEach(function (c) { if (c.iso === "ES") es = c; else rest.push(c); });
    rest.sort(function (a, b) { return countryLabel(a, lang).localeCompare(countryLabel(b, lang)); });
    var sorted = es ? [es].concat(rest) : rest;

    document.querySelectorAll("select[data-role='phone-country']").forEach(function (sel) {
      var current = sel.value || sel.getAttribute("data-default") || "ES";
      sel.textContent = "";
      sorted.forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c.iso;
        opt.setAttribute("data-dial", c.dial);
        opt.textContent = countryLabel(c, lang);
        if (c.iso === current) opt.selected = true;
        sel.appendChild(opt);
      });
    });
  }
  populatePhoneCountrySelects();
  if ("MutationObserver" in window) {
    new MutationObserver(populatePhoneCountrySelects)
      .observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  enhanceSelects();

  /* ---------- engagement instrumentation (Tier 2/3, MEASUREMENT-PLAN.md) ----------
     Centralized here (via walkerPush → walkerOS) instead of data-elb attributes sprinkled across
     7 pages: qed.js already owns the nav/FAQ/form listeners, so one block is easier to keep right.
     Every event carries the walker globals (brand/section/product/language) automatically; these
     `data` payloads only add the event-specific bits. All are consent-gated at the destination and
     never sent off the production domains, same as page view. */
  function initEngagement() {
    var section = window.QED_SITE || "home";

    // Delegated clicks → cta / nav / crosssell / outbound. Classified by class + link target so a
    // hero CTA (.btn--cta) and an in-body cross-sell card (.card → another funnel) don't collide.
    var FUNNEL_HREF = /^\/(corporate|celebrations|venues|partners|franchise|franquicias)\/?($|[?#])/;
    function placement(el) {
      if (el.closest(".hero")) return "hero";
      var withId = el.closest("[id]");
      return (withId && withId.id) || "body";
    }
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href], button.btn");
      if (!a) return;
      var href = a.getAttribute("href") || "";
      var label = (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);
      // External link → outbound (skip in-page #anchors and same-host links).
      if (a.tagName === "A" && a.hostname && a.hostname !== location.hostname && /^https?:/i.test(a.protocol)) {
        walkerPush("outbound click", { href: href, label: label });
        return;
      }
      if (a.closest(".nav__links")) { walkerPush("nav click", { href: href, label: label }); return; }
      if (a.classList.contains("btn--cta") || a.classList.contains("btn--soft")) {
        // A form's own submit button is not a CTA click — the lead events cover that.
        if (a.type !== "submit") walkerPush("cta click", { placement: placement(a), label: label, href: href });
        return;
      }
      if (a.tagName === "A" && !a.closest("footer") && FUNNEL_HREF.test(href)) {
        walkerPush("crosssell click", { to: href.replace(/[?#].*$/, "").replace(/\//g, ""), href: href, label: label });
        return;
      }
    });

    // form view — the denominator for start-rate (view → lead start → lead complete).
    if ("IntersectionObserver" in window) {
      var seen = "WeakSet" in window ? new WeakSet() : null;
      var fio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          if (seen) { if (seen.has(en.target)) return; seen.add(en.target); }
          fio.unobserve(en.target);
          walkerPush("form view", { funnel: section, form: en.target.getAttribute("name") || "" });
        });
      }, { threshold: 0.3 });
      document.querySelectorAll("form[data-action]").forEach(function (f) { fio.observe(f); });
    }

    // faq open — native `toggle` fires in both the animated and reduced-motion paths.
    document.querySelectorAll(".faq details").forEach(function (d) {
      d.addEventListener("toggle", function () {
        if (!d.open) return;
        var s = d.querySelector("summary");
        walkerPush("faq open", { question: s ? (s.textContent || "").trim().slice(0, 120) : "" });
      });
    });

    // scroll reach — 25/50/75/100%, once each, then detach.
    var sent = {}, DEPTHS = [25, 50, 75, 100];
    function onScroll() {
      var scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      var pct = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      DEPTHS.forEach(function (dp) { if (pct >= dp && !sent[dp]) { sent[dp] = 1; walkerPush("scroll reach", { depth: dp }); } });
      if (sent[100]) window.removeEventListener("scroll", onScroll);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  initEngagement();

  /* re-open the cookie banner to review/update consent (privacy/legal page button) */
  document.querySelectorAll("[data-consent-open]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      if (window.QEDConsent && window.QEDConsent.open) window.QEDConsent.open();
    });
  });
})();
