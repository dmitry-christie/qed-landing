// Shared helpers for the QED lead-capture functions.
// All three functions (book-event, franchise-apply, venue-apply) reuse these:
// sanitize input, send a plain-text Telegram message, and fire a Meta CAPI event.
import { createHash } from "node:crypto";

export type Dict = Record<string, string>;

const HTML_TAG = /<[^>]*>/g;

// Per-field and whole-request size ceilings. Generous for real leads, tight
// enough that junk can't balloon the Telegram message or the function payload.
const MAX_FIELD = 1500;
export const MAX_BODY = 10_000;

// Strip HTML tags + trim + cap length. Used on every string field BEFORE validation.
export function sanitize(v: unknown): string {
  if (v == null) return "";
  return String(v).slice(0, MAX_FIELD * 4).replace(HTML_TAG, "").trim().slice(0, MAX_FIELD);
}

// Light shape check, not RFC 5322 — the goal is catching typos and garbage,
// not rejecting valid addresses.
export function isEmail(s: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,24}$/.test(s);
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
// Telegram rejects messages over 4096 chars, so truncate rather than drop the lead.
export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars.");
    return false;
  }
  if (text.length > 4000) text = text.slice(0, 4000) + "…";
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

// 9-digit Spanish mobile/landline numbers get a "34" prefix to look like E.164;
// anything else is passed through digit-only (best-effort — Meta/Google hash
// whatever they're given, so a slightly malformed number just fails to match).
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 9 ? `34${digits}` : digits;
}

// Forward a lead event to RudderStack, which fans it out to Meta Conversions API
// / Google Ads / GA4 via cloud-mode destinations configured once in the
// RudderStack dashboard — this repo no longer calls the Facebook Graph API (or
// any ad platform) directly. No-op unless RUDDERSTACK_WRITE_KEY(_QA) +
// RUDDERSTACK_DATA_PLANE_URL are set, and unless the visitor granted consent
// (qed.js sends d._consent; see shared/consent.js).
export async function sendToRudderstack(event: string, d: Dict, page: string): Promise<void> {
  const writeKey = process.env.CONTEXT === "production"
    ? process.env.RUDDERSTACK_WRITE_KEY
    : process.env.RUDDERSTACK_WRITE_KEY_QA;
  const dataPlaneUrl = process.env.RUDDERSTACK_DATA_PLANE_URL;
  if (!writeKey || !dataPlaneUrl) return;
  if (d._consent !== "granted") return;

  // Hashed client-side per Meta/Google's PII-matching requirements — if the
  // RudderStack destination(s) already hash em/ph/fn/ln themselves, hashing
  // twice is harmless (still a stable one-way match), so this stays defensive.
  const traits: Record<string, string> = {};
  if (d.email) traits.email = sha256(d.email);
  if (d.phone) traits.phone = sha256(normalizePhone(d.phone));
  if (d.firstName) traits.firstName = sha256(d.firstName);
  if (d.lastName) traits.lastName = sha256(d.lastName);
  if (d.city) traits.city = d.city;

  const properties: Record<string, unknown> = { page };
  if (d._fbc) properties.fbc = d._fbc;
  if (d._url) properties.url = d._url;
  // Also surface as a property (not just messageId) so the Facebook Conversions
  // API destination can be mapped to it explicitly if it doesn't dedup on
  // messageId automatically.
  if (d._event_id) properties.event_id = d._event_id;

  const payload = {
    event,
    anonymousId: d._event_id || `${page}-${Date.now()}`,
    ...(d._event_id ? { messageId: d._event_id } : {}),
    properties,
    context: { traits, ip: d._ip, userAgent: d._ua },
  };

  const auth = Buffer.from(`${writeKey}:`).toString("base64");
  try {
    const res = await fetch(`${dataPlaneUrl.replace(/\/$/, "")}/v1/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) console.error("RudderStack track failed:", res.status, await res.text());
  } catch (err) {
    console.error("RudderStack track threw:", err);
  }
}
