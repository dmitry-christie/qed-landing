// Venues sign-up. Forwards to Telegram, fires Meta CAPI.
import type { Handler } from "@netlify/functions";
import { clean, json, metaLine, sendTelegram, fireMetaCapi } from "../lib/forms";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  if (body._honey) return json(200, { ok: true });

  const d = clean(body);

  for (const field of ["venueName", "firstName", "lastName", "email"]) {
    if (!d[field]) return json(400, { ok: false, error: `Missing required field: ${field}` });
  }

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

  const sent = await sendTelegram(text);
  if (!sent) return json(500, { ok: false, error: "Could not send right now. Please email hello@qed.es." });

  fireMetaCapi(d, page);
  return json(200, { ok: true });
};
