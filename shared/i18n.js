/* QED i18n engine (vanilla, static-site friendly).
   - English is baked into the HTML (SEO + no-JS + no flash). Each translatable
     element is a LEAF text node carrying data-i18n="key"; the engine caches that
     English on first run and swaps textContent (no innerHTML, no XSS surface).
   - Spanish lives in window.QED_ES, filled by the per-page /shared/i18n-<page>.js files.
   - Attribute translations: data-i18n-ph (placeholder), data-i18n-aria (aria-label),
     data-i18n-content (meta content).
   - Injects the EN/ES switcher into the nav and the "in development" banner.
   - Persists the choice in localStorage so it carries across pages.            */
window.QED_ES = window.QED_ES || {};
(function () {
  "use strict";

  var cfg = window.QED_CONFIG || {};
  var LANG_KEY = "qed-lang";
  var DEV_KEY = "qed-devbar-dismissed";

  var UI = {
    devTag: "DEV",
    devMsg: {
      EN: "This site is in development. Pricing and details may still change.",
      ES: "Este sitio está en desarrollo. Los precios y detalles pueden cambiar."
    },
    dismiss: { EN: "Dismiss", ES: "Cerrar" }
  };

  function storedLang() { try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var BRAND_DOMAINS = { QED: "quizeatdrink.com", TDT: "tardeodetrivia.com" };
  var BRAND_LANG    = { QED: "EN", TDT: "ES" };

  // Match the visitor's browser language to a locale we support (ES or EN).
  function browserLang() {
    try {
      var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
      for (var i = 0; i < list.length; i++) {
        var l = String(list[i] || "").toLowerCase();
        if (l.indexOf("es") === 0) return "ES";
        if (l.indexOf("en") === 0) return "EN";
      }
    } catch (e) {}
    return null;
  }

  // Priority: brand (baked at build) > explicit stored choice > browser language > deploy default.
  function currentLang() {
    var branded = cfg.brand && BRAND_LANG[cfg.brand];
    if (branded) return branded;
    var s = storedLang();
    if (s === "EN" || s === "ES") return s;
    var b = browserLang();
    if (b) return b;
    return (cfg.defaultLanguage || "EN").toUpperCase() === "ES" ? "ES" : "EN";
  }

  // On a branded deployment, switching language navigates to the other brand's site.
  // On local/preview (no cfg.brand), swap in-page as before.
  function switchLang(lang) {
    if (cfg.brand) {
      var target = lang === "ES" ? BRAND_DOMAINS.TDT : BRAND_DOMAINS.QED;
      var path = window.location.pathname + window.location.search;
      window.location.href = "https://" + target + path;
    } else {
      apply(lang, true);
    }
  }

  function tr(key, lang) {
    return (lang === "ES" && window.QED_ES[key] != null) ? window.QED_ES[key] : null;
  }

  function apply(lang, persist) {
    document.documentElement.setAttribute("lang", lang.toLowerCase());

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (el.__en == null) el.__en = el.textContent;
      var es = tr(el.getAttribute("data-i18n"), lang);
      el.textContent = es != null ? es : el.__en;
    });

    applyAttr("data-i18n-ph", "placeholder", lang);
    applyAttr("data-i18n-aria", "aria-label", lang);
    applyAttr("data-i18n-content", "content", lang);

    document.querySelectorAll(".langsw button").forEach(function (b) {
      var on = b.getAttribute("data-lang") === lang;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });

    var msg = document.querySelector(".devbar__msg");
    if (msg) msg.textContent = UI.devMsg[lang] || UI.devMsg.EN;
    var x = document.querySelector(".devbar__x");
    if (x) x.setAttribute("aria-label", UI.dismiss[lang] || UI.dismiss.EN);

    if (persist) save(LANG_KEY, lang);
  }

  function applyAttr(dataAttr, prop, lang) {
    document.querySelectorAll("[" + dataAttr + "]").forEach(function (el) {
      if (el.__attr == null) el.__attr = {};
      if (el.__attr[prop] == null) el.__attr[prop] = el.getAttribute(prop) || "";
      var es = tr(el.getAttribute(dataAttr), lang);
      el.setAttribute(prop, es != null ? es : el.__attr[prop]);
    });
  }

  function injectSwitcher() {
    var links = document.querySelector(".nav__links");
    if (!links || links.querySelector(".langsw")) return;
    var sw = document.createElement("div");
    sw.className = "langsw";
    sw.setAttribute("role", "group");
    sw.setAttribute("aria-label", "Language");
    ["EN", "ES"].forEach(function (l) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-lang", l);
      b.textContent = l;
      b.addEventListener("click", function () { switchLang(l); });
      sw.appendChild(b);
    });
    var cta = links.querySelector(".btn");
    if (cta) links.insertBefore(sw, cta); else links.appendChild(sw);
  }

  function injectDevbar() {
    if (cfg.devNotice === false) return;
    try { if (localStorage.getItem(DEV_KEY) === "1") return; } catch (e) {}
    if (document.querySelector(".devbar")) return;

    var bar = document.createElement("div");
    bar.className = "devbar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Site notice");

    var tag = document.createElement("span");
    tag.className = "devbar__tag";
    tag.textContent = UI.devTag;

    var msg = document.createElement("span");
    msg.className = "devbar__msg";

    var close = document.createElement("button");
    close.type = "button";
    close.className = "devbar__x";
    close.textContent = "×";
    close.addEventListener("click", function () { save(DEV_KEY, "1"); bar.remove(); });

    bar.appendChild(tag);
    bar.appendChild(msg);
    bar.appendChild(close);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function init() {
    injectDevbar();
    injectSwitcher();
    apply(currentLang());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.QEDi18n = { apply: apply, current: currentLang };
})();
