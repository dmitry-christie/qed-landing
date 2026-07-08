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
  // Lead funnel — Segment naming spec (Title Case, Object + Action). We fire ONE event
  // name, "Form Submitted", split by a `step` property so partial and full submits each
  // build a retargeting audience:
  //   step 1 = the visitor cleared step 1 (name + email captured) — may not finish.
  //   step 2 = the full lead, carrying every step-1 property plus the step-2 fields.
  // Both go to RudderStack server-side (netlify/lib/forms.ts) for hashed traits + ad-blocker
  // resistance: the step-1 POST is fire-and-forget (no Telegram, no UI wait); the step-2
  // POST is the real submit. dataLayer gets both here for GTM parity — RudderStack is only
  // touched server-side, so there's no double-counting. step 1 and step 2 use different
  // event ids (they are distinct conversions, not a client/server pair to dedupe).

  function uuid() {
    return (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : (Date.now() + "-" + Math.random().toString(16).slice(2));
  }

  // Meta click id: a real _fbc cookie, else a stored/URL fbclid (works with no Pixel loaded).
  function fbc() {
    var v = readCookie("_fbc");
    if (v) return v;
    var fbclid = "";
    try {
      var attr = JSON.parse(localStorage.getItem("qed-attr") || "null");
      if (attr && attr.fbclid) fbclid = attr.fbclid;
    } catch (e) {}
    if (!fbclid) {
      var fm = location.search.match(/[?&]fbclid=([^&]+)/);
      if (fm) fbclid = decodeURIComponent(fm[1]);
    }
    return fbclid ? ("fb.1." + Date.now() + "." + fbclid) : "";
  }

  // Snapshot the whole form (both steps live in the DOM at once) + shared context fields.
  function collect(form, action, step, eventId) {
    var data = {};
    new FormData(form).forEach(function (v, k) { if (typeof v === "string") data[k] = v; });
    data.lang = (document.documentElement.getAttribute("lang") || "en").toUpperCase();
    data.country = window.__qed.country || "ES";
    data.form = form.getAttribute("name") || action;
    data.title = document.title;
    data.path = location.pathname;
    data.referrer = document.referrer || "$direct"; // RudderStack's convention for direct
    data._step = String(step);
    data._event_id = eventId;
    data._url = location.href;
    data._consent = window.__qedConsent || "denied";
    if (window.__qedConsentCategories) { try { data._consentCategories = JSON.stringify(window.__qedConsentCategories); } catch (e) {} }
    var f = fbc();
    if (f) data._fbc = f;
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

    function showError(msg) {
      if (errEl) { errEl.textContent = msg; errEl.style.display = "block"; }
      else window.alert(msg);
    }

    function focusFirst(scope) {
      var first = scope && scope.querySelector("input:not(.cselect__native), textarea, select:not(.cselect__native), .cselect__btn");
      if (!first) return;
      if (reduce) first.focus(); else setTimeout(function () { first.focus(); }, 360);
    }

    /* step 1 → step 2: validate required fields, fire the partial "Form Submitted" (step 1),
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
        form.classList.add("at-step2");
        if (!form.__step1Sent) {
          form.__step1Sent = true;
          var d1 = collect(form, action, 1, uuid());
          var et = form.elements.eventType;
          pushDataLayer("Form Submitted", { step: 1, form: d1.form, eventType: et ? et.value : undefined, event_id: d1._event_id });
          // fire-and-forget: partial lead → RudderStack (no Telegram). Never blocks the UI.
          try {
            fetch(action, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(d1),
              keepalive: true
            }).catch(function () {});
          } catch (e) {}
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
      var btn = form.querySelector("[type=submit]");
      var btnKids = btn ? [].slice.call(btn.childNodes) : null;
      if (errEl) errEl.style.display = "none";

      var data = collect(form, action, 2, uuid());

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
          throw new Error((res.body && res.body.error) || "Something went wrong. Please email info@quizeatdrink.com.");
        }
        form.classList.add("sent");
        var s = form.querySelector(".form-success");
        if (s) { s.setAttribute("role", "status"); if (s.focus) s.focus(); }
        pushDataLayer("Form Submitted", { step: 2, form: data.form, event_id: data._event_id });
        form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      }).catch(function (err) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "";
          (btnKids || []).forEach(function (n) { btn.appendChild(n); });
        }
        showError(err && err.message ? err.message : "Something went wrong. Please email info@quizeatdrink.com.");
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
  enhanceSelects();

  /* re-open the cookie banner to review/update consent (privacy/legal page button) */
  document.querySelectorAll("[data-consent-open]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      if (window.QEDConsent && window.QEDConsent.open) window.QEDConsent.open();
    });
  });
})();
