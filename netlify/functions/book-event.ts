// Corporate + Celebrations lead form. Forwards to Telegram + RudderStack.
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

  // Honeypot: pretend success so bots don't retry.
  if (body._honey) return json(200, { ok: true });

  const d = clean(body);
  d._ua = event.headers["user-agent"] || "";
  d._ip = event.headers["x-nf-client-connection-ip"] || "";

  for (const field of ["firstName", "lastName", "email", "eventType"]) {
    if (!d[field]) return json(400, { ok: false, error: `Missing required field: ${field}` });
  }
  if (!isEmail(d.email)) return json(400, { ok: false, error: "Please enter a valid email address." });

  const page = d.page || "corporate";
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
    `📱 Phone: ${d.phone || "—"}`,
    "💬 Message:",
    d.message || "—",
    metaLine(d, page),
  );

  const [telegramResult] = await Promise.allSettled([
    sendTelegram(lines.join("\n")),
    sendToRudderstack("Form Submitted", d, page),
  ]);
  const sent = telegramResult.status === "fulfilled" && telegramResult.value;
  if (!sent) return json(500, { ok: false, error: "Could not send right now. Please email hello@qed.es." });

  return json(200, { ok: true });
};
