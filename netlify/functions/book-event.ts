// Corporate + Celebrations lead form. Forwards to Telegram + walkerOS (Meta CAPI + Amplitude + Google Ads) + Brevo.
import type { Handler } from "@netlify/functions";
import {
  callAlertText, callChatId, clean, correctionText, detailsText, displayPhone, enrichBrevo, isConsentReplay, isEmail,
  isPhone, isTooFast, json, leadValue, MAX_BODY, metaLine, partialLeadText, sendConsentReplay, sendLeadEvent,
  sendPartialTelegram, sendPartialToBrevo, sendTelegram, sendTelegramMessage, sendToBrevo, sendToPortal, type Dict,
} from "../lib/forms";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });
  if ((event.body || "").length > MAX_BODY) return json(413, { ok: false, error: "Request too large" });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  // Honeypot: pretend success so bots don't retry.
  if (body._honey) return json(200, { ok: true });

  const d = clean(body);
  // Bots that render JS/CSS can spot and skip the hidden honeypot field — this catches
  // them by dwell time instead. Same pretend-success response, so bots don't retry.
  if (isTooFast(d)) return json(200, { ok: true });
  d._ua = event.headers["user-agent"] || "";
  d._ip = event.headers["x-nf-client-connection-ip"] || "";

  // Contact-first (the corporate form, data-contact-first in shared/qed.js): step 1 is the lead
  // and needs a phone; last name moves to the optional step 2.
  const contact = d._capture === "contact";
  const required = contact ? ["firstName", "email", "eventType", "phone"] : ["firstName", "lastName", "email", "eventType"];
  for (const field of required) {
    if (!d[field]) return json(400, { ok: false, error: field === "phone" ? "phone" : `Missing required field: ${field}` });
  }
  if (!isEmail(d.email)) return json(400, { ok: false, error: "Please enter a valid email address." });
  // The client shows its own phone hint on "phone"; it never shows this string.
  if (contact && !isPhone(d.phone, d.phoneDial)) return json(400, { ok: false, error: "phone" });

  const page = d.page || "corporate";

  // Consent replay (shared/qed.js): the same lead again, sent only for its analytics event
  // because it first went out before the visitor had accepted. Nothing else runs twice.
  if (isConsentReplay(d)) {
    await sendConsentReplay(d, page);
    return json(200, { ok: true });
  }

  if (contact) return contactFirst(d, page);

  // step 1 = partial submit, fire-and-forget from the client (shared/qed.js): walkerOS
  // `lead start` (distinct from step 2's `lead complete`, so a Lead conversion can never
  // include abandoners, see CLAUDE.md Analytics), one short "not finished" Telegram ping,
  // and the Brevo partial (contact + one reminder in 2h, cancelled if step 2 lands). None of
  // these can fail the response. Partials are not forwarded to the portal.
  if (d._step === "1") {
    await Promise.allSettled([
      sendLeadEvent("lead start", d, page),
      sendPartialTelegram(partialLeadText(d, page, `📋 Event: ${d.eventType}`)),
      sendPartialToBrevo(d, page),
    ]);
    return json(200, { ok: true });
  }

  const text = bookingText(d, page);

  const [telegramResult] = await Promise.allSettled([
    sendTelegram(text),
    sendLeadEvent("lead complete", d, page),
    sendToBrevo(d, page, text),
    // The CRM record. Non-blocking and inert without env; see sendToPortal.
    sendToPortal(d, page),
  ]);
  const sent = telegramResult.status === "fulfilled" && telegramResult.value;
  if (!sent) return json(500, { ok: false, error: "Could not send right now. Please email info@quizeatdrink.com." });

  // value = the expected-value weight this lead was reported with server-side (CAPI), so the
  // browser Pixel Lead (shared/qed.js) sends the same number for the deduped pair.
  return json(200, { ok: true, value: leadValue(page, d.city) });
};

function bookingText(d: Dict, page: string, header = "🎯 New Event Booking Request"): string {
  const lines = [
    header,
    `📋 Event: ${d.eventType}`,
    `🎭 Format: ${d.format || "—"}`,
    `👥 Group: ${d.groupSize || "—"}`,
    `📅 Date: ${d.date || "—"}`,
    `📍 City: ${d.city || "—"}`,
  ];
  if (d.restaurant) lines.push(`🍽 Restaurant: ${d.restaurant}`);
  if (d.company) lines.push(`🏢 Company: ${d.company}`);
  if (d.guestOfHonour) lines.push(`🎉 Guest of Honour: ${d.guestOfHonour}`);
  lines.push(
    `👤 Name: ${`${d.firstName} ${d.lastName || ""}`.trim()}`,
    `📧 Email: ${d.email}`,
    `📱 Phone: ${displayPhone(d)}`,
    "💬 Message:",
    d.message || "—",
    metaLine(d, page),
  );
  return lines.join("\n");
}

// Contact-first. Step 1 (and a correction of it) is the full lead: the call alert, the walkerOS
// `lead complete` under the step-1 event id (E1, which the browser Pixel shares), the Brevo
// contact at LEAD_STAGE "contact" with its deal and confirmation (no reminder), and the portal
// record keyed by _e1. It answers 500 only when the call alert didn't go out, since Telegram is
// the call queue. Step 2 only enriches that same lead: a "Details" reply under the alert, Brevo
// attributes (no deal, no email), the portal row found by _e1, and `lead details` to Amplitude.
async function contactFirst(d: Dict, page: string) {
  const chatId = callChatId();
  const replyTo = Number(d._tgRef) || undefined;

  if (d._step === "2") {
    const [tg, brevo] = await Promise.allSettled([
      sendTelegramMessage(detailsText(d), { chatId, replyTo }),
      enrichBrevo(d, bookingText(d, page, "🎯 Corporate lead (details added)")),
      sendLeadEvent("lead details", d, page),
      sendToPortal(d, page),
    ]);
    const ok = (tg.status === "fulfilled" && tg.value !== null) || (brevo.status === "fulfilled" && brevo.value);
    if (!ok) return json(500, { ok: false, error: "Could not send right now. Please email info@quizeatdrink.com." });
    return json(200, { ok: true });
  }

  // _e1 = this lead's id in the portal, on step 1 as on step 2 and any correction.
  d._e1 = d._event_id;
  const correction = d._correction === "1";
  const [tg] = await Promise.allSettled([
    correction ? sendTelegramMessage(correctionText(d), { chatId, replyTo }) : sendTelegramMessage(callAlertText(d, page), { chatId }),
    sendLeadEvent("lead complete", d, page),
    // A correction re-sends the confirmation to the fixed address but creates no second deal.
    sendToBrevo(d, page, callAlertText(d, page), { stage: "contact", deal: !correction }),
    sendToPortal(d, page),
  ]);
  const tgId = tg.status === "fulfilled" ? tg.value : null;
  if (tgId === null) return json(500, { ok: false, error: "Could not send right now. Please email info@quizeatdrink.com." });

  // tgRef = the call alert's message id; the client sends it back so later replies thread.
  return json(200, { ok: true, value: leadValue(page, d.city), tgRef: correction && replyTo ? replyTo : tgId });
}
