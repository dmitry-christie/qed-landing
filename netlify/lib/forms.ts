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

// Same write key + data plane as shared/consent.js — these are public client-side
// values (like a GA measurement id), not secrets, so both sides hardcode them rather
// than depend on Netlify env vars (RUDDERSTACK_WRITE_KEY/_QA/RUDDERSTACK_DATA_PLANE_URL
// were never actually set in this project, which silently no-opped this function).
const WRITE_KEY = "2e8anllkdUDI2MoK38sqseYAdMC";
const DATA_PLANE_URL = "https://quizeatdricdmw.dataplane.rudderstack.com";

// Mirrors consent.js's analyticsEnabled() — keeps localhost / *.netlify.app deploy
// previews out of production analytics. Reads the page URL the client posted rather
// than a request header, since this is a same-origin fetch() from that exact page.
function analyticsEnabled(url: string | undefined): boolean {
  try {
    const h = new URL(url || "").hostname;
    return /(^|\.)quizeatdrink\.com$/.test(h) || /(^|\.)tardeodetrivia\.com$/.test(h);
  } catch {
    return false;
  }
}

// page → Segment/RudderStack "product" property. Each funnel is a genuinely different
// product line (not just a variant of one), so these are distinct rather than a single
// shared value — the main site's "product" (e.g. "quiz-night") doesn't map cleanly here.
const PRODUCT_BY_PAGE: Record<string, string> = {
  corporate: "corporate-event",
  celebrations: "celebration-event",
  venues: "venue-partnership",
  partners: "franchise-partnership",
};

// Fields already promoted into named properties below, or internal/control fields —
// excluded from the catch-all so they don't appear twice or leak PII into properties
// (PII belongs hashed in traits, handled separately above).
const PROPERTY_OMIT = new Set([
  "email", "phone", "firstName", "lastName",
  "page", "form", "lang", "country", "title", "referrer", "path",
  "_ua", "_ip", "_event_id", "_url", "_consent", "_consentCategories", "_fbc", "_honey", "_step",
]);

// Consent categories the visitor granted (shared/consent.js), forwarded in the shape
// RudderStack's custom consent manager expects. NOTE: allowedConsentIds/deniedConsentIds
// only actually gate anything once matching Consent Categories are configured against
// each destination in the RudderStack dashboard — until then this is inert, same as an
// unset env var (see build.mjs's RUDDERSTACK_CDN_URL note for the same class of issue).
//
// Category split: "analytics" = measurement (did the campaign work — GA4, Meta/Google
// in reporting-only mode); "marketing" = ad campaign optimization/targeting (full Meta
// Conversions API + Google Ads destinations used to bid and target). Meta's Limited Data
// Use and Google's Restricted Data Processing flags belong on those "marketing"-tagged
// destinations specifically (dashboard-side, once configured) — not on this payload.
function consentManagementFrom(d: Dict): { enabled: true; provider: "custom"; allowedConsentIds: string[]; deniedConsentIds: string[] } | undefined {
  if (!d._consentCategories) return undefined;
  let categories: Record<string, boolean>;
  try {
    categories = JSON.parse(d._consentCategories);
  } catch {
    return undefined;
  }
  const allowedConsentIds: string[] = [];
  const deniedConsentIds: string[] = [];
  for (const id of Object.keys(categories)) {
    if (id === "necessary") continue; // matches consent.js: not a real gate on either side
    (categories[id] ? allowedConsentIds : deniedConsentIds).push(id);
  }
  return { enabled: true, provider: "custom", allowedConsentIds, deniedConsentIds };
}

// Forward a lead event to RudderStack, which fans it out to Meta Conversions API
// / Google Ads / GA4 via cloud-mode destinations configured once in the RudderStack
// dashboard — this repo no longer calls the Facebook Graph API (or any ad platform)
// directly. No-op off the production domains, and unless the visitor granted analytics
// consent (qed.js sends d._consent / d._consentCategories; see shared/consent.js).
export async function sendToRudderstack(event: string, d: Dict, page: string): Promise<void> {
  if (!analyticsEnabled(d._url)) return;
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

  // "site" / "language" / "product" naming matches the main site's own RudderStack
  // properties so both sources roll up consistently downstream.
  const properties: Record<string, unknown> = {
    // step 1 = partial (name + email captured, may not finish) · step 2 = full lead. Both
    // fire "Form Submitted"; the client splits them (shared/qed.js) to build two retargeting
    // audiences (started-but-not-finished vs completed). Defaults to 2 for older callers.
    step: Number(d._step) === 1 ? 1 : 2,
    site: (d.lang || "EN").toUpperCase() === "ES" ? "tardeo-de-trivia" : "quiz-eat-drink",
    language: (d.lang || "EN").toLowerCase(),
    product: PRODUCT_BY_PAGE[page] || page,
    page,
    form: d.form,
    path: d.path,
    url: d._url,
    title: d.title,
    referrer: d.referrer,
    country: d.country,
    event_id: d._event_id,
  };
  if (d._fbc) properties.fbc = d._fbc;
  // Every other field the form actually collected (event type, format, group size,
  // date, guest of honour, venue name, nights, message, ...) — whatever properties
  // we have access to for this particular form, without re-listing each one by name.
  for (const key of Object.keys(d)) {
    if (!PROPERTY_OMIT.has(key) && d[key]) properties[key] = d[key];
  }

  const consentManagement = consentManagementFrom(d);

  const payload = {
    event,
    anonymousId: d._event_id || `${page}-${Date.now()}`,
    ...(d._event_id ? { messageId: d._event_id } : {}),
    properties,
    context: { traits, ip: d._ip, userAgent: d._ua, ...(consentManagement ? { consentManagement } : {}) },
  };

  const auth = Buffer.from(`${WRITE_KEY}:`).toString("base64");
  try {
    const res = await fetch(`${DATA_PLANE_URL}/v1/track`, {
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
