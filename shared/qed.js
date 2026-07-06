/* QED landing pages — progressive enhancement only.
   Mobile nav, scroll reveals, and the two-step lead forms that fetch() to the
   Netlify functions (book-event / franchise-apply / venue-apply) → Telegram. */
(function () {
  "use strict";

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

  /* scroll reveal */
  var reveals = document.querySelectorAll(".reveal");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reveals.length) {
    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("in"); });
    }
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
  function track(name, detail) {
    pushDataLayer(name, detail);
    try {
      if (window.__qedConsent === "granted" && window.__qedRudderReady && window.rudderanalytics && window.rudderanalytics.track) {
        window.rudderanalytics.track(name, detail || {});
      }
    } catch (e) {}
  }
  // Segment naming spec: Title Case, Object + Action. "Form Started" has no server-side
  // equivalent (nothing was posted yet) so it tracks client-side. "Form Submitted" is
  // fired server-side instead (netlify/lib/forms.ts, once the lead is actually accepted) —
  // richer properties (hashed traits, IP/UA) and no dependency on the client SDK or
  // ad-blockers, so only push it to dataLayer here to avoid double-counting in RudderStack.
  window.trackLeadIntent = window.trackLeadIntent || function (d) { track("Form Started", d); };
  window.trackLeadComplete = window.trackLeadComplete || function (d) { pushDataLayer("Form Submitted", d); };

  /* lead forms — two-step + fetch() → Netlify function → Telegram (no page reload) */
  document.querySelectorAll("form[data-action]").forEach(function (form) {
    var action = form.getAttribute("data-action");
    var step1 = form.querySelector("[data-step='1']");
    var step2 = form.querySelector("[data-step='2']");
    var continueBtn = form.querySelector("[data-continue]");
    var backBtn = form.querySelector("[data-back]");
    var errEl = form.querySelector(".form-error");

    function showError(msg) {
      if (errEl) { errEl.textContent = msg; errEl.style.display = "block"; }
      else window.alert(msg);
    }

    function focusFirst(scope) {
      var first = scope && scope.querySelector("input,select,textarea");
      if (!first) return;
      if (reduce) first.focus(); else setTimeout(function () { first.focus(); }, 360);
    }

    /* step 1 → step 2: validate the required fields, then hand off to step 2
       (CSS crossfades/collapses the two — see .at-step2 rules in qed.css) */
    if (continueBtn && step2) {
      continueBtn.addEventListener("click", function () {
        var scope = step1 || form;
        var invalid = null;
        scope.querySelectorAll("input,select,textarea").forEach(function (el) {
          if (el.required && !el.checkValidity() && !invalid) invalid = el;
        });
        if (invalid) { invalid.reportValidity ? invalid.reportValidity() : invalid.focus(); return; }
        form.classList.add("at-step2");
        var et = form.elements.eventType;
        trackLeadIntent({ form: form.getAttribute("name") || action, eventType: et ? et.value : undefined });
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

    /* submit → POST JSON to the function */
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var btn = form.querySelector("[type=submit]");
      var btnKids = btn ? [].slice.call(btn.childNodes) : null;
      if (errEl) errEl.style.display = "none";

      var data = {};
      new FormData(form).forEach(function (v, k) { if (typeof v === "string") data[k] = v; });
      data.lang = (document.documentElement.getAttribute("lang") || "en").toUpperCase();
      data.country = window.__qed.country || "ES";
      data.form = form.getAttribute("name") || action;
      data.title = document.title;
      data.path = location.pathname;
      data.referrer = document.referrer || "$direct"; // RudderStack's own convention for direct traffic

      /* CAPI/RudderStack match data: one id shared by the client + server track
         calls (dedup), the page url, current consent, and a Meta click id built
         from a real _fbc cookie or a stored/URL fbclid (works with no Pixel loaded). */
      data._event_id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : (Date.now() + "-" + Math.random().toString(16).slice(2));
      data._url = location.href;
      data._consent = window.__qedConsent || "denied";
      if (window.__qedConsentCategories) { try { data._consentCategories = JSON.stringify(window.__qedConsentCategories); } catch (e) {} }
      data._fbc = readCookie("_fbc");
      if (!data._fbc) {
        var fbclid = "";
        try {
          var attr = JSON.parse(localStorage.getItem("qed-attr") || "null");
          if (attr && attr.fbclid) fbclid = attr.fbclid;
        } catch (e) {}
        if (!fbclid) {
          var fm = location.search.match(/[?&]fbclid=([^&]+)/);
          if (fm) fbclid = decodeURIComponent(fm[1]);
        }
        if (fbclid) data._fbc = "fb.1." + Date.now() + "." + fbclid;
      }

      if (btn) { btn.disabled = true; btn.textContent = "…"; }

      fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(function (r) {
        return r.text().then(function (t) {
          var j = {}; try { j = JSON.parse(t); } catch (e) {}
          return { ok: r.ok, body: j };
        });
      }).then(function (res) {
        if (!(res.ok && res.body && res.body.ok)) {
          throw new Error((res.body && res.body.error) || "Something went wrong. Please email hello@qed.es.");
        }
        form.classList.add("sent");
        var s = form.querySelector(".form-success");
        if (s) { s.setAttribute("role", "status"); if (s.focus) s.focus(); }
        trackLeadComplete({ form: form.getAttribute("name") || action, event_id: data._event_id });
        form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      }).catch(function (err) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "";
          (btnKids || []).forEach(function (n) { btn.appendChild(n); });
        }
        showError(err && err.message ? err.message : "Something went wrong. Please email hello@qed.es.");
      });
    });
  });
})();
