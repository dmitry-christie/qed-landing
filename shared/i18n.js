/* QED i18n engine (vanilla, static-site friendly).
   - English is baked into the HTML (SEO + no-JS + no flash). Each translatable
     element is a LEAF text node carrying data-i18n="key"; the engine caches that
     English on first run and swaps textContent (no innerHTML, no XSS surface).
   - Spanish lives in window.QED_ES, filled by the per-page /shared/i18n-<page>.js files.
   - Attribute translations: data-i18n-ph (placeholder), data-i18n-aria (aria-label),
     data-i18n-content (meta content), data-i18n-href, data-i18n-alt, data-i18n-value (a
     radio's submitted value).
   - Per-language content (ES = TDT, EN = QED): data-lang-hide and data-count-es, see
     applyLangHide() / applyCounts().
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
  // Functional-consent gate: language + dismissed-notice memory are "functional" cookies,
  // so only persist them once the visitor allows functional storage (consent.js sets these
  // globals). Where the consent banner isn't shown (local/preview, __qedConsentActive false)
  // preferences persist as before so those environments keep working.
  function save(k, v) {
    if (window.__qedConsentActive && !window.__qedFunctional) return;
    try { localStorage.setItem(k, v); } catch (e) {}
  }

  // These are the actual hosts this site is deployed on. quizeatdrink.com /
  // tardeodetrivia.com (no "landing." prefix) are a separate, unrelated site —
  // sending the switcher there takes visitors off this site entirely.
  var BRAND_DOMAINS = { QED: "landing.quizeatdrink.com", TDT: "landing.tardeodetrivia.com" };
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
    // Best-effort `language switch` (walkerOS). On a branded build the next line navigates to the
    // other brand domain, so this may not flush before unload — reliable only for the in-page
    // (unbranded/preview) switch below. Never blocks the switch.
    try { if (window.elb) window.elb("language switch", { to: String(lang).toLowerCase() }); } catch (e) {}
    if (cfg.brand) {
      var target = lang === "ES" ? BRAND_DOMAINS.TDT : BRAND_DOMAINS.QED;
      var url = "https://" + target + window.location.pathname + window.location.search;
      // Carry the cookie-consent choice across the two brand domains — separate origins
      // can't share localStorage, so without this a language switch re-triggers the banner.
      // consent.js on the destination reads ?qedc=, adopts it, then strips it from the URL.
      try {
        var c = localStorage.getItem("qed-consent");
        if (c) url += (url.indexOf("?") > -1 ? "&" : "?") + "qedc=" + encodeURIComponent(c);
      } catch (e) {}
      window.location.href = url;
    } else {
      apply(lang, true);
    }
  }

  function tr(key, lang) {
    return (lang === "ES" && window.QED_ES[key] != null) ? window.QED_ES[key] : null;
  }

  /* Brand-specific content. ES is the TDT site and EN is QED, and the two brands don't run in
     the same cities (TDT has no Barcelona), so some copy is not a translation but a different
     fact per language:
     - data-lang-hide="es" (space-separated list allowed): the element is gone while the page is
       in that language and comes back in the other. Used for the Barcelona map pin/label/arrow
       and the Barcelona <option> in the city pickers.
     - data-count-es="N" next to data-count="N": a counter whose Spanish value differs. qed.js
       owns the count-up; applyCounts() below only fixes the resting text before qed.js runs.
     Both run on every apply(), so repeated toggles are idempotent. */
  var langDetached = [];

  function hiddenIn(el, lang) {
    var list = String(el.getAttribute("data-lang-hide") || "").toLowerCase().split(/[\s,]+/);
    return list.indexOf(lang.toLowerCase()) > -1;
  }

  // <option>s leave the DOM instead of being styled away: iOS Safari still lists a
  // display:none/[hidden] option in its native picker. A comment keeps the slot so the option
  // goes back where it was. A selected option is deselected on the way out and the select falls
  // back to its default option, or failing that its empty-value placeholder ("Choose a city…"),
  // rather than whatever the browser picks on its own (the first enabled option, which can be a
  // real city when the placeholder is disabled).
  function detachOption(opt) {
    var parent = opt.parentNode;
    if (!parent) return;
    var sel = opt.closest ? opt.closest("select") : null;
    var wasSelected = opt.selected;
    var marker = document.createComment(" lang-hide ");
    parent.insertBefore(marker, opt);
    parent.removeChild(opt);
    opt.__lhMarker = marker;
    langDetached.push(opt);
    if (!wasSelected) return;
    opt.selected = false;
    if (!sel || sel.multiple) return;
    var def = -1, blank = -1;
    for (var i = 0; i < sel.options.length; i++) {
      if (def < 0 && sel.options[i].defaultSelected) def = i;
      if (blank < 0 && sel.options[i].value === "") blank = i;
    }
    if (def > -1 || blank > -1) sel.selectedIndex = def > -1 ? def : blank;
    try { sel.dispatchEvent(new Event("change", { bubbles: true })); } catch (e) {}
  }

  // Everything else (HTML or SVG) gets an inline display:none !important: it beats any author
  // display rule, and the [hidden] attribute does nothing on SVG. The element's own inline
  // display, if it had one, is put back when it shows again.
  function hideEl(el) {
    if (el.__lhHidden) return;
    el.__lhHidden = true;
    el.__lhDisplay = [el.style.getPropertyValue("display"), el.style.getPropertyPriority("display")];
    el.style.setProperty("display", "none", "important");
  }
  function showEl(el) {
    if (!el.__lhHidden) return;
    el.__lhHidden = false;
    var d = el.__lhDisplay || ["", ""];
    if (d[0]) el.style.setProperty("display", d[0], d[1]); else el.style.removeProperty("display");
  }

  function applyLangHide(lang) {
    // Options detached for another language go back first, so the translation pass that follows
    // in apply() also refreshes their text.
    langDetached = langDetached.filter(function (opt) {
      if (hiddenIn(opt, lang)) return true;
      var m = opt.__lhMarker;
      opt.__lhMarker = null;
      if (m && m.parentNode) m.parentNode.replaceChild(opt, m);
      return false;
    });
    document.querySelectorAll("[data-lang-hide]").forEach(function (el) {
      var hide = hiddenIn(el, lang);
      if (String(el.tagName).toUpperCase() === "OPTION") { if (hide) detachOption(el); return; }
      if (hide) hideEl(el); else showEl(el);
    });
  }

  // Same grouping as qed.js formatCount(): "always", so ES reads 7.510 like the printed one-pager.
  function fmtCount(n, lang) {
    try { return new Intl.NumberFormat(lang.toLowerCase(), { useGrouping: "always" }).format(n); }
    catch (e) { try { return n.toLocaleString(lang.toLowerCase()); } catch (e2) { return String(n); } }
  }

  // Counters qed.js hasn't picked up yet show the right number for the language, so a slow
  // script load after the veil lifts can't flash the English "7" on the Spanish site. Once
  // qed.js has claimed a counter (__qedCount) it keeps it in sync itself.
  function applyCounts(lang) {
    var es = lang === "ES";
    document.querySelectorAll("[data-count]").forEach(function (el) {
      if (el.__qedCount) return;
      var n = parseInt(el.getAttribute(es && el.hasAttribute("data-count-es") ? "data-count-es" : "data-count"), 10);
      if (isFinite(n)) el.textContent = fmtCount(n, lang);
    });
  }

  function apply(lang, persist) {
    document.documentElement.setAttribute("lang", lang.toLowerCase());

    applyLangHide(lang);
    applyCounts(lang);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (el.__en == null) el.__en = el.textContent;
      var es = tr(el.getAttribute("data-i18n"), lang);
      el.textContent = es != null ? es : el.__en;
    });

    applyAttr("data-i18n-ph", "placeholder", lang);
    applyAttr("data-i18n-aria", "aria-label", lang);
    applyAttr("data-i18n-content", "content", lang);
    applyAttr("data-i18n-href", "href", lang);
    // alt text is the image's accessible name and is what image search indexes, so it leaks
    // English on the ES site exactly like visible copy does.
    applyAttr("data-i18n-alt", "alt", lang);
    // A radio's submitted value, when it is its localized label (the corporate event-type cards
    // post what the old <option>s did: the label text in the page language).
    applyAttr("data-i18n-value", "value", lang);

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
    // Lifts the i18n-veil (see qed.css) set synchronously in <head> on brand builds with a
    // forced language (TDT) — now that the swap is done, it's safe to paint.
    document.documentElement.classList.remove("i18n-veil");
  }

  // This script tag sits after all data-i18n content in the page, so by the time it runs
  // every translatable element already exists — no need to wait for DOMContentLoaded, which
  // would also block on any scripts still to come after this one (e.g. consent.js) and widen
  // the veiled/flash window on slow connections.
  init();

  window.QEDi18n = { apply: apply, current: currentLang };
})();
