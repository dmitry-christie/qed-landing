/* QED landing pages — progressive enhancement only.
   Mobile nav, scroll reveals, and the two-step lead forms that fetch() to the
   Netlify functions (book-event / franchise-apply / venue-apply) → Telegram. */
(function () {
  "use strict";

  /* footer year */
  var y = String(new Date().getFullYear());
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = y; });

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

  /* window.__qed (lang/country) + analytics stubs (push to dataLayer; safe no-ops) */
  function assign(a, b) { for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) a[k] = b[k]; return a; }
  window.__qed = window.__qed || {};
  if (!window.__qed.country) window.__qed.country = "ES";
  function track(name, detail) {
    try { (window.dataLayer = window.dataLayer || []).push(assign({ event: name }, detail || {})); } catch (e) {}
  }
  window.trackLeadIntent = window.trackLeadIntent || function (d) { track("lead_intent", d); };
  window.trackLeadComplete = window.trackLeadComplete || function (d) { track("lead_complete", d); };

  /* lead forms — two-step + fetch() → Netlify function → Telegram (no page reload) */
  document.querySelectorAll("form[data-action]").forEach(function (form) {
    var action = form.getAttribute("data-action");
    var step2 = form.querySelector("[data-step='2']");
    var continueBtn = form.querySelector("[data-continue]");
    var errEl = form.querySelector(".form-error");

    function showError(msg) {
      if (errEl) { errEl.textContent = msg; errEl.style.display = "block"; }
      else window.alert(msg);
    }

    /* step 1 → step 2: validate the required fields, then slide step 2 open */
    if (continueBtn && step2) {
      continueBtn.addEventListener("click", function () {
        var scope = form.querySelector("[data-step='1']") || form;
        var invalid = null;
        scope.querySelectorAll("input,select,textarea").forEach(function (el) {
          if (el.required && !el.checkValidity() && !invalid) invalid = el;
        });
        if (invalid) { invalid.reportValidity ? invalid.reportValidity() : invalid.focus(); return; }
        step2.classList.add("is-open");
        form.classList.add("at-step2");
        (continueBtn.closest(".full") || continueBtn).style.display = "none";
        var et = form.elements.eventType;
        trackLeadIntent({ form: form.getAttribute("name") || action, eventType: et ? et.value : undefined });
        var first = step2.querySelector("input,select,textarea");
        if (first) { if (reduce) first.focus(); else setTimeout(function () { first.focus(); }, 360); }
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
        trackLeadComplete({ form: form.getAttribute("name") || action });
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
