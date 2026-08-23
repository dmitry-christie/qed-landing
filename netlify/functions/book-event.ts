// Corporate + Celebrations lead form. Forwards to Telegram + walkerOS (Meta CAPI + Amplitude + Google Ads) + Brevo.
import type { Handler } from "@netlify/functions";
import { clean, displayPhone, isEmail, isTooFast, json, MAX_BODY, metaLine, sendTelegram, sendToBrevo, sendLeadEvent, sendToPortal } from "../lib/forms";

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

  for (const field of ["firstName", "lastName", "email", "eventType"]) {
    if (!d[field]) return json(400, { ok: false, error: `Missing required field: ${field}` });
  }
  if (!isEmail(d.email)) return json(400, { ok: false, error: "Please enter a valid email address." });

  const page = d.page || "corporate";

  // step 1 = partial submit, fire-and-forget from the client (shared/qed.js): forward to
  // walkerOS server-side (Amplitude + Meta CAPI) for the retargeting audience, but don't ping the founders' Telegram. Distinct
  // event name from step 2 (`lead complete`) so a Lead conversion mapped to it in
  // Google Ads / Meta can never accidentally include abandoners — see CLAUDE.md Analytics.
  if (d._step === "1") {
    await sendLeadEvent("lead start", d, page);
    return json(200, { ok: true });
  }

  const lines = [
    "🎯 New Event Booking Request",
    `📋 Event: ${d.eventType}`,
    `🎭 Format: ${d.format || "—"}`,
    `👥 Group: ${d.groupSize || "—"}`,
    `📅 Date: ${d.date || "—"}`,
    `📍 City: ${d.city || "—"}`,
  ];
  if (d.guestOfHonour) lines.push(`🎉 Guest of Honour: ${d.guestOfHonour}`);
  lines.push(
    `👤 Name: ${d.firstName} ${d.lastName}`,
    `📧 Email: ${d.email}`,
    `📱 Phone: ${displayPhone(d)}`,
    "💬 Message:",
    d.message || "—",
    metaLine(d, page),
  );
  const text = lines.join("\n");

  const [telegramResult] = await Promise.allSettled([
    sendTelegram(text),
    sendLeadEvent("lead complete", d, page),
    sendToBrevo(d, page, text),
    // The CRM record. Non-blocking and inert without env; see sendToPortal.
    sendToPortal(d, page),
  ]);
  const sent = telegramResult.status === "fulfilled" && telegramResult.value;
  if (!sent) return json(500, { ok: false, error: "Could not send right now. Please email info@quizeatdrink.com." });

  return json(200, { ok: true });
};
