/* Consent banner — owns the granular consent UI + storage. It no longer loads any analytics
   SDK itself: walkerOS (shared/walker.js) is the collection layer now. This file just records
   the visitor's choice and hands it off — it sets window.__qedConsent* (read by walker.entry,
   i18n.js and brevo.js) and dispatches a "qed:consentchange" event on every decision;
   scripts/walker.entry.mjs reads the stored categories on init and listens for that event, then
   pushes elb('walker consent', …). No write key, no SDK snippet, and no page() call here — the
   walker browser source fires `page view` itself, gated on Analytics consent.

   Consent is granular (Necessary / Functional / Analytics / Marketing), stored as a JSON object
   under "qed-consent". walkerOS destinations declare the category they need, so nothing fires
   before it's granted: Amplitude + measurement need Analytics; Meta Pixel/CAPI + Google Ads need
   Marketing. Marketing additionally gates the ad-match identity attached server-side (see
   netlify/lib/forms.ts): hashed em/ph/name, IP, click-ids. Necessary is always on and never sent.
   Functional is a first-party preference gate (language memory, dismissed notices — see i18n.js);
   it only decides whether we may persist those preference values.

   Analytics = measurement (is the site/campaign working). Marketing = ad optimization/targeting
   (Meta Conversions API + Google Ads). The production-domain gate (analyticsEnabled below, mirrored
   in walker.entry) keeps localhost / *.netlify.app previews out of live ad/analytics data. */
(function () {
  "use strict";

  var KEY = "qed-consent";
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

  // Analytics loading lives in walkerOS now (shared/walker.js). This file no longer fetches an
  // SDK or fires a page view — walker.entry reads window.__qedConsentCategories (set above by
  // applyCategories) on init and listens for the "qed:consentchange" dispatched in decide().

  function decide(cats) {
    categories = cats;
    saveCategories(cats);
    applyCategories(cats);
    // Hand the fresh decision to walkerOS and to other consent-gated features (shared/brevo.js).
    // walker.entry pushes elb('walker consent', …) from this; nothing analytics fired before it.
    try { window.dispatchEvent(new CustomEvent("qed:consentchange", { detail: cats })); } catch (e) {}
  }

  // force = reopened from the privacy page (window.QEDConsent.open) — shows the banner even
  // after a decision and even off the production domains, pre-filled with the current choice.
  function showBanner(force) {
    if (!force && !analyticsEnabled()) return; // nothing to measure off production domains
    if (!force && categories != null) return;  // already decided, on this or an earlier page
    var existing = document.querySelector(".consent");
    if (existing) { if (!force) return; closeBar(existing); }

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
      { id: "analytics", labelKey: "consent.cat.analytics", label: "Analytics", descKey: "consent.cat.analyticsd", desc: "Measurement: how the site and ad campaigns are performing (Amplitude, Meta, Google)." },
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
      closeBar(bar);
    });

    reject.addEventListener("click", function () {
      decide({ functional: false, analytics: false, marketing: false });
      closeBar(bar);
    });
    accept.addEventListener("click", function () {
      decide({ functional: true, analytics: true, marketing: true });
      closeBar(bar);
    });

    actions.appendChild(reject);
    actions.appendChild(accept);
    bar.appendChild(msg);
    bar.appendChild(cats);
    bar.appendChild(actions);
    document.body.appendChild(bar);
    reserveSpace(bar);

    if (force) setOpen(true); // reopened from the privacy page → show the toggles straight away

    if (window.QEDi18n) window.QEDi18n.apply(window.QEDi18n.current());
  }

  // While the banner is up, reserve its height at the bottom of the page so nothing (a form's
  // Continue button above all) is stuck underneath it: body padding lets the last content
  // scroll clear of it, scroll-padding keeps anchor jumps and focus() scrolls above it.
  // Re-measured when the banner changes size (Manage expands it).
  var spaceObserver = null;
  function reserveSpace(bar) {
    function apply() {
      if (!bar.parentNode) return;
      var gap = parseFloat(window.getComputedStyle(bar).bottom) || 0; // it floats above the edge
      var h = Math.ceil(bar.offsetHeight + gap) + "px";
      document.body.style.paddingBottom = h;
      document.documentElement.style.scrollPaddingBottom = h;
    }
    apply();
    if ("ResizeObserver" in window) {
      spaceObserver = new ResizeObserver(apply);
      spaceObserver.observe(bar);
    } else {
      window.addEventListener("resize", apply);
      bar.addEventListener("transitionend", apply);
    }
  }
  function closeBar(bar) {
    bar.remove();
    if (spaceObserver) { spaceObserver.disconnect(); spaceObserver = null; }
    document.body.style.paddingBottom = "";
    document.documentElement.style.scrollPaddingBottom = "";
  }

  // Re-open the banner to review/update consent (wired to the button on /privacy/).
  window.QEDConsent = { open: function () { showBanner(true); } };

  // Defer the first-visit banner until the visitor scrolls (or a few seconds pass, for
  // anyone who never scrolls) instead of slapping it over the hero CTAs on load. Doesn't
  // affect the consent gate itself — nothing analytics-related loads until a real decision
  // is made either way, this just delays when the prompt appears.
  //
  // It also stays back while a lead form is on screen or being typed in. The hero CTA
  // smooth-scrolls to the form, that scroll used to open the banner, and on a phone the
  // banner then sat on step 1's Continue button. So a scroll is judged once it settles (the
  // CTA scroll starts with the form below the fold and ends on it), and the banner opens on
  // the first check that finds no form in view and no focus inside one: a later scroll that
  // leaves the form behind, focus leaving the form, or right after a lead is sent (qed.js
  // fires "qed:leadsent"). The client-side lead events wait in walkerOS's consent queue in
  // the meantime and go out if the visitor then accepts; qed.js re-sends the server-side lead
  // events itself on that accept (the functions drop them while _consent is "denied").
  //
  // A lead-form section counts only if it holds a real lead form: the hub's #plan is two link
  // cards right under the hero, not a form, and counting it kept the banner away from nearly
  // every hub visitor.
  var LEAD_FORMS = "#apply, #quote, #plan, #start, form[data-action]";

  function leadSections() {
    var out = [];
    var els = document.querySelectorAll(LEAD_FORMS);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if ((el.matches && el.matches("form[data-action]")) || (el.querySelector && el.querySelector("form[data-action]"))) out.push(el);
    }
    return out;
  }
  function leadFormInView() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var els = leadSections();
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.height > 0 && r.bottom > 0 && r.top < vh) return true;
    }
    return false;
  }
  function focusInLeadForm() {
    var a = document.activeElement;
    if (!a || a === document.body) return false;
    var els = leadSections();
    for (var i = 0; i < els.length; i++) if (els[i] === a || (els[i].contains && els[i].contains(a))) return true;
    return false;
  }

  // A form already on the first screen at load (the /venues/ hero form) can never be scrolled
  // away on a short page, so the in-view hold would keep the banner back for good and nothing
  // on that page would ever be measured. For such a form only focus inside it holds the banner;
  // the CTA-scroll problem above can't happen there (no scroll brings it into view). Forms
  // below the fold at load (every other page) keep the full hold.
  function deferredShow() {
    if (categories != null || !analyticsEnabled()) return; // decided already, or nothing to ask
    var armed = false, done = false, settle = null;
    var formAtLoad = !location.hash && (window.pageYOffset || 0) < 10 && leadFormInView();
    function show() {
      if (done) return;
      done = true;
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusout", onFocusOut, true);
      window.removeEventListener("qed:leadsent", show);
      clearTimeout(timer);
      clearTimeout(settle);
      showBanner(false);
    }
    function check() {
      armed = true;
      if ((formAtLoad || !leadFormInView()) && !focusInLeadForm()) show();
    }
    function onScroll() {
      clearTimeout(settle);
      settle = setTimeout(function () { settle = null; check(); }, 250);
    }
    // focusout fires before focus lands on the next element, so look a tick later.
    function onFocusOut() { if (armed) setTimeout(check, 0); }
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusout", onFocusOut, true);
    window.addEventListener("qed:leadsent", show);
    var timer = setTimeout(function () { if (!settle) check(); }, 4000); // mid-scroll: the settle checks
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", deferredShow);
  } else {
    deferredShow();
  }
})();
