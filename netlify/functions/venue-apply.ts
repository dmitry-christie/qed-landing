// Venues sign-up. Forwards to Telegram + RudderStack.
import type { Handler } from "@netlify/functions";
import { clean, isEmail, json, MAX_BODY, metaLine, sendTelegram, sendToRudderstack } from "../lib/forms";

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
  d._ua = event.headers["user-agent"] || "";
  d._ip = event.headers["x-nf-client-connection-ip"] || "";

  for (const field of ["venueName", "firstName", "lastName", "email"]) {
    if (!d[field]) return json(400, { ok: false, error: `Missing required field: ${field}` });
  }
  if (!isEmail(d.email)) return json(400, { ok: false, error: "Please enter a valid email address." });

  const page = d.page || "venues";
  const text = [
    "🍻 New Venue Sign-up",
    `🏠 Venue: ${d.venueName}`,
    `📍 City: ${d.city || "—"}`,
    `🎟 Format: ${d.format || "—"}`,
    `📆 Nights/week: ${d.nights || "—"}`,
    `👤 Name: ${d.firstName} ${d.lastName}`,
    `📧 Email: ${d.email}`,
    "💬 Message:",
    d.message || "—",
    metaLine(d, page),
  ].join("\n");

  const [telegramResult] = await Promise.allSettled([
    sendTelegram(text),
    sendToRudderstack("Form Submitted", d, page),
  ]);
  const sent = telegramResult.status === "fulfilled" && telegramResult.value;
  if (!sent) return json(500, { ok: false, error: "Could not send right now. Please email hello@qed.es." });

  return json(200, { ok: true });
};
