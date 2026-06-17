// Shared helpers for the QED lead-capture functions.
// All three functions (book-event, franchise-apply, venue-apply) reuse these:
// sanitize input, send a plain-text Telegram message, and fire a Meta CAPI event.
import { createHash } from "node:crypto";

export type Dict = Record<string, string>;

const HTML_TAG = /<[^>]*>/g;

// Strip HTML tags + trim. Used on every string field BEFORE validation.
export function sanitize(v: unknown): string {
  if (v == null) return "";
  return String(v).replace(HTML_TAG, "").trim();
}

// Flatten + sanitize the parsed JSON body into a string dict.
export function clean(body: Record<string, unknown>): Dict {
  const out: Dict = {};
  for (const key of Object.keys(body)) {
    const val = body[key];
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
      out[key] = sanitize(val);
    }
  }
  return out;
}

export function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// Build the "🌐 Lang … | Country … | Page …" footer line shared by every message.
export function metaLine(d: Dict, page: string): string {
  return `🌐 Lang: ${d.lang || "—"} | Country: ${d.country || "—"} | Page: ${page}`;
}

// POST a plain-text message to the Telegram group. No parse_mode (plain text).
export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars.");
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) console.error("Telegram sendMessage failed:", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("Telegram sendMessage threw:", err);
    return false;
  }
}

const sha256 = (s: string) => createHash("sha256").update(s.trim().toLowerCase()).digest("hex");

// Fire-and-forget Meta CAPI CompleteRegistration. No-op unless META_PIXEL_ID +
// META_CAPI_TOKEN are set, so it never blocks or breaks the lead flow.
export function fireMetaCapi(d: Dict, page: string): void {
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !token) return;

  const userData: Record<string, unknown> = {};
  if (d.email) userData.em = [sha256(d.email)];
  if (d._fbp) userData.fbp = d._fbp;
  if (d._fbc) userData.fbc = d._fbc;
  if (d._ua) userData.client_user_agent = d._ua;

  const payload = {
    data: [
      {
        event_name: "CompleteRegistration",
        event_time: Math.floor(Date.now() / 1000),
        ...(d._event_id ? { event_id: d._event_id } : {}),
        ...(d._url ? { event_source_url: d._url } : {}),
        action_source: "website",
        user_data: userData,
        custom_data: { content_name: page, content_category: "lead" },
      },
    ],
  };

  void fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    /* fire-and-forget: never block the response */
  });
}
