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

// Build the "🌐 Lang … | Country … | Page …" footer line shared by every message, plus a
// "📣 Source:" line when the lead carries campaign attribution — the founders' per-lead
// lead-quality feedback loop (tell a €50-CPC paid lead from an organic one at a glance).
export function metaLine(d: Dict, page: string): string {
  const base = `🌐 Lang: ${d.lang || "—"} | Country: ${d.country || "—"} | Page: ${page}`;
  const hasAttr = d._utm_source || d._utm_campaign || d._gclid || d._wbraid || d._gbraid || d._fbclid || d._ref;
  if (!hasAttr) return base;
  const src = d._utm_source || d._ref || "direct";
  const medium = d._utm_medium || (d._gclid || d._wbraid || d._gbraid ? "cpc" : d._fbclid ? "paid_social" : "—");
  const campaign = d._utm_campaign || "—";
  const clicks = [d._gclid && "gclid", (d._wbraid || d._gbraid) && "wbraid", d._fbclid && "fbclid"].filter(Boolean).join("·");
  return `${base}\n📣 Source: ${src} / ${medium} / ${campaign}${clicks ? ` · ${clicks}` : ""}`;
}

// "+34 963 12 34 56" for the Telegram message — same best-effort spirit as
// normalizePhone: d.phoneDial is only there for submissions that went through the
// country selector, so this just degrades to the raw digits when it's missing.
export function displayPhone(d: Dict): string {
  if (!d.phone) return "—";
  return d.phoneDial ? `+${d.phoneDial} ${d.phone}` : d.phone;
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

// The client sends the dial code picked in the phone field's country selector
// (shared/phone-countries.js) as `phoneDial` — trust it when present. Falls back to the
// old Spain heuristic for any submission without it (e.g. a cached page pre-dating the
// selector). Either way this is best-effort: Meta/Google hash whatever they're given, so
// a slightly malformed number just fails to match, it's not a validation gate.
function normalizePhone(phone: string, dial?: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return digits;
  if (dial && /^\d{1,4}$/.test(dial)) return `${dial}${digits}`;
  return digits.length === 9 ? `34${digits}` : digits;
}

// Push the lead into Brevo (our CRM, starter plan) as a contact + a pipeline deal —
// Telegram is a transient ping the founders can miss/scroll past, RudderStack only feeds
// ad platforms, so Brevo is the only durable, searchable, trackable-through-a-sales-
// pipeline place a lead lives.
// Env: BREVO_API_KEY (required) + BREVO_LIST_ID (default list) and/or
// BREVO_LIST_ID_<PAGE> (e.g. BREVO_LIST_ID_PARTNERS) to route funnels to separate lists.
// Only called on the full (step 2) submission — a step-1 partial abandon isn't a
// qualified lead yet; RudderStack already covers that audience for retargeting.
//
// NOTE: Brevo rejects unknown custom attributes, so before this goes live create these
// contact attributes in Brevo (Contacts > Settings > Contact attributes, type "Text"):
// CITY, LANG, LEAD_SOURCE, UTM_SOURCE, UTM_CAMPAIGN, NOTES. FIRSTNAME/LASTNAME/SMS are
// built in. A missing list/attribute makes this fail silently (logged, non-blocking) —
// check Netlify function logs after setup to confirm it's actually landing contacts.
function brevoListId(page: string): number | undefined {
  const perPage = process.env[`BREVO_LIST_ID_${page.toUpperCase()}`];
  const id = Number(perPage || process.env.BREVO_LIST_ID);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

const BREVO_TIMEOUT_MS = 4000;

// This account only has the one default pipeline/stage Brevo creates on signup — hardcoded
// like RudderStack's WRITE_KEY above, since these are internal Brevo ids for this account,
// not secrets or per-deploy config. Update both if the pipeline is ever rebuilt in Brevo.
const BREVO_PIPELINE_ID = "6a0e00d16662659f87dcaf97"; // "Deals Pipeline"
const BREVO_STAGE_NEW_ID = "14486bd2-629d-46d8-b65f-6dc6019339ea"; // "New" stage

// Human-readable deal title per funnel — shown in the Brevo pipeline board, so it needs to
// let the founders tell leads apart at a glance without opening each one.
function dealName(d: Dict, page: string): string {
  const who = `${d.firstName} ${d.lastName}`.trim();
  switch (page) {
    case "corporate":
    case "celebrations":
      return `${d.eventType || "Event"} — ${who}`;
    case "venues":
      return `${d.venueName || "Venue"} — ${who}`;
    case "partners":
      return `Franchise: ${d.city || "—"} — ${who}`;
    default:
      return `${page} lead — ${who}`;
  }
}

// No monetary "amount" is set — LEAD_VALUE above is a relative ad-bidding weight, not a
// real deal size, and we don't have real average deal values yet. Founders can fill amount
// in once a lead is qualified, same as they'd do with a deal from any other source.
async function createBrevoDeal(apiKey: string, d: Dict, page: string, notes: string, contactId?: number): Promise<void> {
  try {
    const res = await fetch("https://api.brevo.com/v3/crm/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "api-key": apiKey },
      body: JSON.stringify({
        name: dealName(d, page),
        attributes: {
          pipeline: BREVO_PIPELINE_ID,
          deal_stage: BREVO_STAGE_NEW_ID,
          deal_description: notes.slice(0, 1800),
        },
        ...(contactId ? { linkedContactsIds: [contactId] } : {}),
      }),
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });
    if (!res.ok) console.error("Brevo deal create failed:", res.status, await res.text());
  } catch (err) {
    console.error("Brevo deal create threw:", err);
  }
}

export async function sendToBrevo(d: Dict, page: string, notes: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("Missing BREVO_API_KEY env var.");
    return;
  }
  if (!d.email) return;

  const attributes: Record<string, string> = { LEAD_SOURCE: page };
  if (d.firstName) attributes.FIRSTNAME = d.firstName;
  if (d.lastName) attributes.LASTNAME = d.lastName;
  if (d.phone) {
    const digits = d.phone.replace(/\D/g, "");
    if (digits) attributes.SMS = `+${d.phoneDial && /^\d{1,4}$/.test(d.phoneDial) ? d.phoneDial : digits.length === 9 ? "34" : ""}${digits}`;
  }
  if (d.city) attributes.CITY = d.city;
  if (d.lang) attributes.LANG = d.lang.toUpperCase();
  if (d._utm_source) attributes.UTM_SOURCE = d._utm_source;
  if (d._utm_campaign) attributes.UTM_CAMPAIGN = d._utm_campaign;
  attributes.NOTES = notes.slice(0, 1800);

  const listId = brevoListId(page);
  const headers = { "Content-Type": "application/json", Accept: "application/json", "api-key": apiKey };

  // Brevo returns the new contact's id on create (201) but no body on update-existing
  // (204) — grab it from the create response when we can, otherwise look it up by email,
  // so the deal below can always link back to the contact.
  let contactId: number | undefined;
  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: d.email,
        attributes,
        ...(listId ? { listIds: [listId] } : {}),
        updateEnabled: true, // resubmitting the same email (e.g. a fixed typo) updates, doesn't 400
      }),
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });
    if (res.status === 201) {
      contactId = (await res.json().catch(() => null))?.id;
    } else if (!res.ok) {
      console.error("Brevo contact upsert failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Brevo contact upsert threw:", err);
  }

  if (contactId === undefined) {
    try {
      const res = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(d.email)}`, {
        headers,
        signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
      });
      if (res.ok) contactId = (await res.json().catch(() => null))?.id;
    } catch (err) {
      console.error("Brevo contact lookup threw:", err);
    }
  }

  await createBrevoDeal(apiKey, d, page, notes, contactId);
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
  // attribution + identity — promoted to clean-named properties / context below, so keep
  // the raw underscore-prefixed versions out of the catch-all (no duplicates).
  "_utm_source", "_utm_medium", "_utm_campaign", "_utm_term", "_utm_content",
  "_gclid", "_wbraid", "_gbraid", "_fbclid", "_msclkid", "_ttclid", "_ref", "_eid",
]);

// Relative lead value (EUR) for value-based bidding (Meta value optimization / Google
// tROAS). Proxy weights until real pricing lands — a franchise lead is worth far more than
// a birthday enquiry; a venue partnership sits between. Dashboard can override per action.
const LEAD_VALUE: Record<string, number> = {
  partners: 10,
  venues: 3,
  corporate: 1,
  celebrations: 1,
};

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
  if (d._consent !== "granted") return; // analytics gate — measurement

  // Marketing gate: identity used for AD MATCHING (hashed em/ph/name, IP, click-id,
  // external_id) is attached ONLY when the visitor granted the "marketing" category —
  // belt-and-braces on top of the dashboard's per-destination Consent Category mapping,
  // so an analytics-only visitor is still measured but never matched/targeted for ads.
  let marketing = false;
  try { marketing = !!JSON.parse(d._consentCategories || "{}").marketing; } catch { /* no categories → treat as denied */ }

  // Hashed client-side per Meta/Google's PII-matching requirements — if the
  // RudderStack destination(s) already hash em/ph/fn/ln themselves, hashing
  // twice is harmless (still a stable one-way match), so this stays defensive.
  const traits: Record<string, string> = {};
  if (marketing) {
    if (d.email) traits.email = sha256(d.email);
    if (d.phone) traits.phone = sha256(normalizePhone(d.phone, d.phoneDial));
    if (d.firstName) traits.firstName = sha256(d.firstName);
    if (d.lastName) traits.lastName = sha256(d.lastName);
    if (d.city) traits.city = d.city;
  }

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
    // Relative lead value for value-based bidding (dashboard may override per action).
    value: LEAD_VALUE[page] || 1,
    currency: "EUR",
    page,
    form: d.form,
    path: d.path,
    url: d._url,
    title: d.title,
    referrer: d.referrer,
    country: d.country,
    event_id: d._event_id,
  };

  // First-touch attribution (captured client-side). Click-ids drive offline/enhanced
  // conversion matching: gclid/wbraid/gbraid → Google Ads, fbclid → Meta. These are
  // campaign identifiers, not personal data, so they ride the analytics gate (needed to
  // attribute the conversion at all) rather than the marketing gate.
  const ATTR = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "wbraid", "gbraid", "fbclid", "msclkid", "ttclid", "ref"];
  for (const k of ATTR) { const v = d["_" + k]; if (v) properties[k] = v; }

  if (marketing && d._fbc) properties.fbc = d._fbc;

  // Every other field the form actually collected (event type, format, group size,
  // date, guest of honour, venue name, nights, message, ...) — whatever properties
  // we have access to for this particular form, without re-listing each one by name.
  for (const key of Object.keys(d)) {
    if (!PROPERTY_OMIT.has(key) && d[key]) properties[key] = d[key];
  }

  const consentManagement = consentManagementFrom(d);

  const context: Record<string, unknown> = {
    userAgent: d._ua,
    ...(consentManagement ? { consentManagement } : {}),
  };
  if (marketing) {
    if (Object.keys(traits).length) context.traits = traits;
    if (d._ip) context.ip = d._ip;
    if (d._eid) context.externalId = d._eid; // pseudonymous match key → CAPI external_id
  }

  const payload = {
    event,
    anonymousId: d._event_id || `${page}-${Date.now()}`,
    ...(d._event_id ? { messageId: d._event_id } : {}),
    properties,
    context,
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
