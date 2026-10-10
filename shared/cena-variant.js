/* Christmas ad-group variant (?v=cena), shared by /corporate/ and /team-events/. SEASONAL
   (Sep-Dec 2026): after mid-December delete this file, the <script> that defines window.QED_CENA
   and the one that loads this file on both pages, and the c.hero.*cena* / te.hero.*cena* /
   c.cta.holdcena keys. Deleting it retires the variant and the hero-switch rewrite; it also
   retires the [data-preselect-event] listener (last paragraph: the organiser card CTA on
   /team-events/ then only scrolls to the form), so move that listener to qed.js first if the
   one-tap preselect should survive.

   Must run BEFORE shared/i18n.js: it re-points the hero's data-i18n attributes to the page's cena
   keys and bakes their English, so i18n.js caches that English as the EN text and swaps in the
   matching ES string, on load and on any language toggle. Each page defines, first:
     window.QED_CENA = { h1a, h1b, sub, cta }   // each a [i18nKey, englishText] pair
   Triggers: ?v=cena, or a utm_campaign containing "cena" (from the URL, else the first-touch record
   qed.js keeps in localStorage "qed-attr"). It also preselects the "christmas-dinner" event type
   and format, and carries ?v=cena across the hero switch and the pointer (a[data-aud-link]):
   ?v is not stored anywhere, only utm_campaign is, and a UTM on those links would overwrite the
   stored first touch.

   NOT cena-triggered: any [data-preselect-event="<key>"] control (the organiser card CTA on
   /team-events/) preselects that event type and format when clicked, on every visit. That listener
   is registered before the variant check below, so it works with or without ?v=cena. */
(function () {
  function fire(el) {
    // qed.js listens for "change": the custom dropdown refreshes its label, the event-type
    // fieldset clears its error
    try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch (e) {}
  }
  function preselect(v) {
    var radio = document.querySelector('#c-event input[type="radio"][data-key="' + v + '"]');
    if (radio && !radio.checked) { radio.checked = true; fire(radio); }
    var sel = document.getElementById("c-format");
    if (!sel) return;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].getAttribute("data-key") !== v) continue;
      sel.selectedIndex = i;
      fire(sel);
      return;
    }
  }
  document.querySelectorAll("[data-preselect-event]").forEach(function (el) {
    el.addEventListener("click", function () { preselect(el.getAttribute("data-preselect-event")); });
  });

  var cfg = window.QED_CENA;
  if (!cfg) return;

  var cena = false;
  try {
    var q = new URLSearchParams(location.search);
    cena = (q.get("v") || "").toLowerCase() === "cena";
    if (!cena) {
      // Same precedence as qed.js captureAttribution(), which runs later and has not touched the
      // stored record yet: click/UTM params on this URL replace the stored touch, except a link in
      // one of our own Brevo emails (utm_source=sendinblue|brevo, no ad click id), which keeps a
      // stored touch that is still inside its 30-day window. With no params, the stored touch
      // counts while it is inside that window.
      var a = null;
      try { a = JSON.parse(localStorage.getItem("qed-attr") || "null"); } catch (e) {}
      var fresh = !!(a && a.ts && Date.now() - a.ts < 30 * 24 * 60 * 60 * 1000);
      var hasParams = /[?&](utm_[a-z]+|gclid|wbraid|gbraid|fbclid|msclkid|ttclid)=/i.test(location.search);
      var ownEmail = /^(sendinblue|brevo)$/i.test(q.get("utm_source") || "") &&
        !q.get("gclid") && !q.get("wbraid") && !q.get("gbraid") && !q.get("fbclid");
      var camp = hasParams && !(ownEmail && fresh) ? (q.get("utm_campaign") || "") : (fresh ? (a.utm_campaign || "") : "");
      cena = /cena/i.test(camp);
    }
  } catch (e) {}
  if (!cena) return;

  function swap(el, pair) { if (el && pair) { el.setAttribute("data-i18n", pair[0]); el.textContent = pair[1]; } }
  var h1 = document.getElementById("c-hero-h1");
  if (h1) {
    var parts = h1.querySelectorAll("[data-i18n]");
    swap(parts[0], cfg.h1a);
    swap(parts[1], cfg.h1b);
    h1.style.maxWidth = "17ch"; // longer line than the default H1; keeps it to ~4 lines
  }
  swap(document.getElementById("c-hero-sub"), cfg.sub);
  swap(document.getElementById("c-hero-cta"), cfg.cta);
  preselect("christmas-dinner");
  document.documentElement.setAttribute("data-variant", "cena");

  document.querySelectorAll("a[data-aud-link]").forEach(function (link) {
    var href = link.getAttribute("href") || "";
    if (href && href.indexOf("?") === -1) link.setAttribute("href", href + "?v=cena");
  });
})();
