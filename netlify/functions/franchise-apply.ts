// Partners (franchise) application. Forwards to Telegram + RudderStack + Brevo.
import type { Handler } from "@netlify/functions";
import { clean, displayPhone, isEmail, isTooFast, json, MAX_BODY, metaLine, sendTelegram, sendToBrevo, sendToRudderstack } from "../lib/forms";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });
  if ((event.body || "").length > MAX_BODY) return json(413, { ok: false, error: "Request too large" });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  if (body._honey) return json(200, { ok: true });

  const d = clean(body);
  if (isTooFast(d)) return json(200, { ok: true });
  d._ua = event.headers["user-agent"] || "";
  d._ip = event.headers["x-nf-client-connection-ip"] || "";

  for (const field of ["firstName", "lastName", "email", "city"]) {
    if (!d[field]) return json(400, { ok: false, error: `Missing required field: ${field}` });
  }
  if (!isEmail(d.email)) return json(400, { ok: false, error: "Please enter a valid email address." });

  const page = d.page || "partners";

  // step 1 = partial submit, fire-and-forget from the client (shared/qed.js): forward to
  // RudderStack for the retargeting audience, but don't ping the founders' Telegram.
  if (d._step === "1") {
    await sendToRudderstack("Form Submitted", d, page);
    return json(200, { ok: true });
  }

  const text = [
    "🤝 New Franchise Application",
    `📍 City / area: ${d.city}`,
    `🏠 Venues: ${d.venueSituation || "—"}`,
    `👤 Name: ${d.firstName} ${d.lastName}`,
    `📧 Email: ${d.email}`,
    `📱 Phone: ${displayPhone(d)}`,
    "💬 About:",
    d.about || d.message || "—",
    metaLine(d, page),
  ].join("\n");

  const [telegramResult] = await Promise.allSettled([
    sendTelegram(text),
    sendToRudderstack("Form Submitted", d, page),
    sendToBrevo(d, page, text),
  ]);
  const sent = telegramResult.status === "fulfilled" && telegramResult.value;
  if (!sent) return json(500, { ok: false, error: "Could not send right now. Please email info@quizeatdrink.com." });

  return json(200, { ok: true });
};
