// Partners (franchise) application. Forwards to Telegram, fires Meta CAPI.
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

  for (const field of ["firstName", "lastName", "email", "city"]) {
    if (!d[field]) return json(400, { ok: false, error: `Missing required field: ${field}` });
  }

  const page = d.page || "partners";
  const text = [
    "🤝 New Franchise Application",
    `📍 City / area: ${d.city}`,
    `🏠 Venues: ${d.venueSituation || "—"}`,
    `👤 Name: ${d.firstName} ${d.lastName}`,
    `📧 Email: ${d.email}`,
    `📱 Phone: ${d.phone || "—"}`,
    "💬 About:",
    d.about || d.message || "—",
    metaLine(d, page),
  ].join("\n");

  const sent = await sendTelegram(text);
  if (!sent) return json(500, { ok: false, error: "Could not send right now. Please email hello@qed.es." });

  fireMetaCapi(d, page);
  return json(200, { ok: true });
};
