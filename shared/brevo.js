/* Brevo Conversations live chat — gated behind FUNCTIONAL consent (shared/consent.js).
   Loads only once the visitor has allowed functional storage: on production that means
   after they accept (Functional or Accept-all); on hosts where the banner isn't shown
   (local / preview) window.__qedFunctional defaults true, so it loads there for testing.
   Launcher is brand orange, bottom-right ('br'). Loading it consent-gated keeps the cookie
   policy's "nothing but necessary loads before consent" promise accurate — Brevo sets its
   own cookies, so it must wait for consent like RudderStack does. */
(function () {
  "use strict";
  var loaded = false;

  function load() {
    if (loaded || !window.__qedFunctional) return;
    loaded = true;

    // Launcher styling + placement (Brevo reads this before its widget script runs).
    window.BrevoConversationsSetup = {
      buttonPosition: "br",
      colors: { buttonBg: "#E8631A", buttonText: "#FFFFFF" }
    };

    window.BrevoConversationsID = "6a0e00ca9c2d1da06c0c918f";
    window.BrevoConversations = window.BrevoConversations || function () {
      (window.BrevoConversations.q = window.BrevoConversations.q || []).push(arguments);
    };
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://conversations-widget.brevo.com/brevo-conversations.js";
    (document.head || document.getElementsByTagName("head")[0]).appendChild(s);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
  // Load when the visitor grants consent later on this page (consent.js dispatches this).
  window.addEventListener("qed:consentchange", load);
})();
