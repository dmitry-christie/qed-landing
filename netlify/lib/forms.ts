// Shared helpers for the QED lead-capture functions.
// All three functions (book-event, franchise-apply, venue-apply) reuse these:
// sanitize input, send a plain-text Telegram message, and fire a Meta CAPI event.
import { startFlow } from "@walkeros/collector";
import { destinationMeta } from "@walkeros/server-destination-meta";
import { destinationAPI } from "@walkeros/server-destination-api";

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

// Complements the hidden _honey field (shared/qed.js): a bot that renders the page and CSS
// (headless Chrome, not a dumb HTTP client) can inspect computed styles and skip a hidden
// input entirely, walking straight past the honeypot. It's far less likely to also emulate
// a human-plausible dwell time. qed.js stamps _t = Date.now() when the script starts, so a
// submission claiming to have taken under MIN_FILL_MS to fill a multi-field form is almost
// certainly automated. Only fires on a definite, non-negative gap — a missing _t (cached
// pre-this-change JS) or a negative one (client/server clock skew) fails open rather than
// blocking a real visitor.
const MIN_FILL_MS = 1500;
export function isTooFast(d: Dict): boolean {
  const elapsed = Date.now() - Number(d._t || NaN);
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < MIN_FILL_MS;
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

// Worst case (all attempts fail) must fit under Netlify's 10s synchronous function
// limit so the LOST LEAD log line actually gets a chance to emit: 3 * 2500ms timeout +
// (500 + 1000)ms backoff = 9s.
const TELEGRAM_TIMEOUT_MS = 2500;
const TELEGRAM_MAX_ATTEMPTS = 3;
const TELEGRAM_RETRY_DELAY_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendTelegramOnce(token: string, chatId: string, text: string): Promise<boolean> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
  });
  if (!res.ok) console.error("Telegram sendMessage failed:", res.status, await res.text());
  return res.ok;
}

// POST a plain-text message to the Telegram group. No parse_mode (plain text).
// Telegram rejects messages over 4096 chars, so truncate rather than drop the lead.
// Retries a couple of times (transient network blips / Telegram hiccups) before giving
// up. On final failure, logs the full message under a distinct "LOST LEAD" marker —
// this is the only durable copy of the alert at that point, so it needs to be grep/
// alertable from Netlify function logs rather than silently swallowed.
export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars.");
    console.error("LOST LEAD (Telegram not configured):", text);
    return false;
  }
  if (text.length > 4000) text = text.slice(0, 4000) + "…";

  for (let attempt = 1; attempt <= TELEGRAM_MAX_ATTEMPTS; attempt++) {
    try {
      if (await sendTelegramOnce(token, chatId, text)) return true;
    } catch (err) {
      console.error(`Telegram sendMessage threw (attempt ${attempt}/${TELEGRAM_MAX_ATTEMPTS}):`, err);
    }
    if (attempt < TELEGRAM_MAX_ATTEMPTS) await sleep(TELEGRAM_RETRY_DELAY_MS * attempt);
  }

  console.error("LOST LEAD (Telegram failed after retries):", text);
  return false;
}

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
// Telegram is a transient ping the founders can miss/scroll past, and walkerOS only
// feeds the ad + analytics platforms, so Brevo is the only durable, searchable, trackable-through-a-sales-
// pipeline place a lead lives.
// Env: BREVO_API_KEY (required) + BREVO_LIST_ID (default list) and/or
// BREVO_LIST_ID_<PAGE> (e.g. BREVO_LIST_ID_PARTNERS) to route funnels to separate lists.
// Only called on the full (step 2) submission — a step-1 partial abandon isn't a
// qualified lead yet; walkerOS already covers that audience for retargeting.
//
// NOTE: Brevo rejects unknown custom attributes, so before this goes live create these
// contact attributes in Brevo (Contacts > Settings > Contact attributes, type "Text"):
// LEAD_CITY, LANG, LEAD_SOURCE, UTM_SOURCE, UTM_CAMPAIGN, NOTES, LAST_DEAL. FIRSTNAME/
// LASTNAME/SMS are built in. A missing list/attribute makes this fail silently (logged,
// non-blocking) — check Netlify function logs after setup to confirm it's actually
// landing contacts.
function brevoListId(page: string): number | undefined {
  const perPage = process.env[`BREVO_LIST_ID_${page.toUpperCase()}`];
  const id = Number(perPage || process.env.BREVO_LIST_ID);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

const BREVO_TIMEOUT_MS = 4000;

// This account only has the one default pipeline/stage Brevo creates on signup — hardcoded
// (internal Brevo ids for this account, not secrets or per-deploy config), since they are
// not secrets or per-deploy config. Update both if the pipeline is ever rebuilt in Brevo.
const BREVO_PIPELINE_ID = "6a0e00d16662659f87dcaf97"; // "Deals Pipeline"
const BREVO_STAGE_NEW_ID = "14486bd2-629d-46d8-b65f-6dc6019339ea"; // "New" stage

// Same BRAND env var build.mjs uses (set per Netlify site, also readable at function
// runtime) — prefixed onto the deal name so the Brevo "TDT"/"QED" saved views (each
// filtered on the deal name containing that string) actually catch every deal.
function brandTag(): string {
  return (process.env.BRAND || "").toUpperCase() === "TDT" ? "TDT" : "QED";
}

// Human-readable deal title per funnel — shown in the Brevo pipeline board, so it needs to
// let the founders tell leads apart at a glance without opening each one.
function dealName(d: Dict, page: string): string {
  const who = `${d.firstName} ${d.lastName}`.trim();
  const tag = `[${brandTag()}]`;
  switch (page) {
    case "corporate":
    case "celebrations":
      return `${tag} ${d.eventType || "Event"} — ${who}`;
    case "venues":
      return `${tag} ${d.venueName || "Venue"} — ${who}`;
    case "partners":
      return `${tag} Franchise: ${d.city || "—"} — ${who}`;
    default:
      return `${tag} ${page} lead — ${who}`;
  }
}

// No monetary "amount" is set — LEAD_VALUE above is a relative ad-bidding weight, not a
// real deal size, and we don't have real average deal values yet. Founders can fill amount
// in once a lead is qualified, same as they'd do with a deal from any other source.
async function createBrevoDeal(apiKey: string, d: Dict, page: string, notes: string, contactId?: number): Promise<boolean> {
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
    if (!res.ok) {
      console.error("Brevo deal create failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Brevo deal create threw:", err);
    return false;
  }
}

// Brevo validates a contact upsert as one atomic payload — if a single custom attribute's
// value doesn't match how it's configured in the Brevo dashboard, the whole request 400s
// and NOTHING is saved, not just that field. This bit LEAD_CITY specifically: Brevo's
// built-in CITY is a "Category" enum (madrid/valencia/murcia/santiago/barcelona), not free
// text — every submission sending a real typed city (e.g. "Santiago de Compostela") 400ed
// the whole contact. LEAD_CITY is this integration's own attribute (must be created as
// "Text" in Brevo, see the setup note above), so it can't collide with a built-in's type.
// This retry is now a generic safety net for any OTHER attribute drifting out of sync with
// its Brevo type: if Brevo's error names one of our attribute keys, drop it and retry once
// so the contact still lands — better than silently losing the entire lead over one
// misconfigured field. Whatever's dropped still survives in NOTES, since the alert text
// always includes every field the form collected.
async function upsertBrevoContact(
  headers: Record<string, string>,
  email: string,
  attributes: Record<string, string>,
  listId: number | undefined,
): Promise<number | undefined> {
  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        attributes,
        ...(listId ? { listIds: [listId] } : {}),
        updateEnabled: true, // resubmitting the same email (e.g. a fixed typo) updates, doesn't 400
      }),
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });
    if (res.status === 201) {
      return (await res.json().catch(() => null))?.id;
    }
    if (!res.ok) {
      const errText = await res.text();
      console.error("Brevo contact upsert failed:", res.status, errText);
      const badAttr = Object.keys(attributes).find((k) => new RegExp(k, "i").test(errText));
      if (badAttr) {
        console.error(`Retrying Brevo contact upsert without ${badAttr} (attribute type mismatch in Brevo dashboard — fix its type there).`);
        const rest = { ...attributes };
        delete rest[badAttr];
        return upsertBrevoContact(headers, email, rest, listId);
      }
    }
  } catch (err) {
    console.error("Brevo contact upsert threw:", err);
  }
  return undefined;
}

// Deals aren't deduplicated by Brevo, and paid traffic draws bots that render JS/CSS well
// enough to dodge the honeypot and timing check some of the time — a burst of retries (bot
// or human double-click/back-button) would otherwise create a fresh deal on every hit.
// Stashed on the contact itself as "<page>:<epoch ms>" rather than queried from Brevo's
// deals search API, since Contacts is the one endpoint this integration already depends on
// and knows works. Needs a LAST_DEAL Text attribute in Brevo (see setup note above) — until
// then this attribute is just dropped same as any other misconfigured one, and dedupe no-ops.
const DEAL_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

async function getBrevoContact(headers: Record<string, string>, email: string): Promise<{ id?: number; attributes?: Record<string, unknown> } | undefined> {
  try {
    const res = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      headers,
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });
    if (res.ok) return await res.json().catch(() => undefined);
  } catch (err) {
    console.error("Brevo contact lookup threw:", err);
  }
  return undefined;
}

// Templates #7 (EN, "QED Lead Follow-up") and #8 (ES, "TdT Lead Follow-up") in Brevo,
// tag lead-followup — branch their body per LEAD_SOURCE (contact.LEAD_SOURCE) internally,
// so one send per submission covers every funnel. Picked by LANG, not BRAND, since a
// Spanish-speaking visitor filling the QED site (or vice versa) should still get the
// email in the language they actually typed the form in.
const BREVO_TEMPLATE_ID_EN = 7;
const BREVO_TEMPLATE_ID_ES = 8;

async function sendBrevoFollowupEmail(apiKey: string, d: Dict, contactId: number | undefined): Promise<void> {
  if (!contactId) return; // template personalizes from the contact record; nothing to send without one
  const templateId = d.lang?.toUpperCase() === "ES" ? BREVO_TEMPLATE_ID_ES : BREVO_TEMPLATE_ID_EN;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "api-key": apiKey },
      body: JSON.stringify({ templateId, to: [{ email: d.email }] }),
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });
    if (!res.ok) console.error("Brevo follow-up email send failed:", res.status, await res.text());
  } catch (err) {
    console.error("Brevo follow-up email send threw:", err);
  }
}

export async function sendToBrevo(d: Dict, page: string, notes: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("Missing BREVO_API_KEY env var.");
    return;
  }
  if (!d.email) return;

  const headers = { "Content-Type": "application/json", Accept: "application/json", "api-key": apiKey };
  const existing = await getBrevoContact(headers, d.email);
  const lastDeal = typeof existing?.attributes?.LAST_DEAL === "string" ? existing.attributes.LAST_DEAL : "";
  const [lastDealPage, lastDealTs] = [lastDeal.slice(0, lastDeal.lastIndexOf(":")), Number(lastDeal.slice(lastDeal.lastIndexOf(":") + 1))];
  const dupeDeal = lastDealPage === page && Number.isFinite(lastDealTs) && Date.now() - lastDealTs < DEAL_DEDUPE_WINDOW_MS;

  const attributes: Record<string, string> = { LEAD_SOURCE: page };
  if (d.firstName) attributes.FIRSTNAME = d.firstName;
  if (d.lastName) attributes.LASTNAME = d.lastName;
  if (d.phone) {
    const digits = d.phone.replace(/\D/g, "");
    if (digits) attributes.SMS = `+${d.phoneDial && /^\d{1,4}$/.test(d.phoneDial) ? d.phoneDial : digits.length === 9 ? "34" : ""}${digits}`;
  }
  if (d.city) attributes.LEAD_CITY = d.city;
  if (d.lang) attributes.LANG = d.lang.toUpperCase();
  if (d._utm_source) attributes.UTM_SOURCE = d._utm_source;
  if (d._utm_campaign) attributes.UTM_CAMPAIGN = d._utm_campaign;
  attributes.NOTES = notes.slice(0, 1800);

  const listId = brevoListId(page);
  const upsertedId = await upsertBrevoContact(headers, d.email, attributes, listId);
  const contactId = existing?.id ?? upsertedId;

  if (dupeDeal) {
    console.error("Skipping duplicate Brevo deal:", page, d.email);
    return;
  }
  await sendBrevoFollowupEmail(apiKey, d, contactId);
  const dealCreated = await createBrevoDeal(apiKey, d, page, notes, contactId);
  // Only bump LAST_DEAL once the deal actually exists — bumping it up front would make a
  // failed deal create (timeout/5xx) look like a real one, silently suppressing the
  // resubmission that would otherwise retry it within the dedupe window.
  if (dealCreated) {
    await upsertBrevoContact(headers, d.email, { LAST_DEAL: `${page}:${Date.now()}` }, listId);
  }
}

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

// page -> walker "product" global/property. Each funnel is a genuinely different
// product line (not just a variant of one), so these are distinct rather than a single
// shared value — the main site's "product" (e.g. "quiz-night") doesn't map cleanly here.
const PRODUCT_BY_PAGE: Record<string, string> = {
  corporate: "corporate-event",
  celebrations: "celebration-event",
  venues: "venue-partnership",
  partners: "franchise-partnership",
};

// Relative lead value (EUR) for value-based bidding (Meta value optimization / Google
// tROAS). Proxy weights until real pricing lands — a franchise lead is worth far more than
// a birthday enquiry; a venue partnership sits between. Dashboard can override per action.
const LEAD_VALUE: Record<string, number> = {
  partners: 10,
  venues: 3,
  corporate: 1,
  celebrations: 1,
};

// ---- walkerOS server collector: lead events → Meta CAPI + Amplitude (EU) ----
// Replaces the old Segment forwarder (this repo no longer touches Segment). Same event taxonomy
// as the browser walker (shared/walker.js) but server-side, so the money events (`lead start` /
// `lead complete`) are ad-blocker-resistant and can carry hashed PII. Consent-gated exactly as
// before: nothing sends without analytics consent, and ad-match identity (em/ph/name, IP,
// click-ids, fbc/fbp, external_id) rides the marketing gate. (Google Ads is CLIENT-side — gtag
// enhanced conversions in shared/walker.js — so it isn't here.)
//
// PII SCOPING: identity lives ONLY in the walker `user` object, never in event `data`. The Meta
// CAPI destination reads it via a user_data map (and hashes em/ph/fn/ln itself); the Amplitude
// transform reads data+globals+device only, so a lead's email/phone never reaches Amplitude.
//
// Each destination is added only when its credentials are present, so a brand/site without them
// stays inert (nothing sends) — the "add credentials later" path, same as the browser bundle.

// walker event name → Meta CAPI standard event. lead start and lead complete MUST differ, or two
// events with different ids would both post as "Lead" and inflate the conversion. complete = the
// primary Lead; start = InitiateCheckout (upper-funnel; wire as a secondary conversion in Meta).
const META_EVENT_NAME: Record<string, string> = {
  "lead complete": "Lead",
  "lead start": "InitiateCheckout",
};

// walker event name → Amplitude event_type (Title Case, matches the browser destination matrix).
const AMPLITUDE_EVENT_NAME: Record<string, string> = {
  "lead complete": "Lead Submitted",
  "lead start": "Lead Started",
};

// City normalization (MEASUREMENT-PLAN.md): the forms collect free-text city, which fragments
// audiences (Madrid/madrid/"Madrid "). The event carries a normalized slug; the raw string stays
// in Telegram + Brevo's LEAD_CITY only. Slugs match Brevo's built-in CITY enum. Unknown → other.
const CITY_ALIASES: Record<string, string> = {
  "santiago de compostela": "santiago", compostela: "santiago",
  barna: "barcelona", bcn: "barcelona",
};
const KNOWN_CITIES = ["madrid", "valencia", "murcia", "santiago", "barcelona"];
export function normalizeCity(raw: string | undefined): string {
  if (!raw) return "other";
  const s = raw.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  if (CITY_ALIASES[s]) return CITY_ALIASES[s];
  for (const city of KNOWN_CITIES) if (s.includes(city)) return city;
  return "other";
}

const AMPLITUDE_URL = "https://api.eu.amplitude.com/2/httpapi"; // EU data residency (decided)

// Build the collector's destinations from env — inert-safe (only what's configured is added).
function serverDestinations(): Record<string, unknown> {
  const dests: Record<string, unknown> = {};

  const metaPixelId = process.env.META_PIXEL_ID;
  const metaToken = process.env.META_CAPI_TOKEN;
  if (metaPixelId && metaToken) {
    dests.meta = {
      code: destinationMeta,
      config: {
        consent: { marketing: true },
        settings: {
          pixelId: metaPixelId,
          accessToken: metaToken,
          action_source: "website",
          ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
          // Identity pulled from the walker `user` object (never `data`). Meta hashes
          // em/ph/fn/ln/external_id/ct itself; fbc/fbp/ip/ua are sent raw per Meta's spec.
          user_data: {
            em: "user.email", ph: "user.phone", fn: "user.firstName", ln: "user.lastName",
            external_id: "user.id", ct: "user.city",
            fbc: "user.fbc", fbp: "user.fbp", fbclid: "user.fbclid",
            client_ip_address: "user.ip", client_user_agent: "user.ua",
          },
        },
        mapping: {
          "*": { "*": { ignore: true } }, // allowlist: only the lead events post to CAPI
          lead: {
            complete: { name: META_EVENT_NAME["lead complete"], data: { value: "data.value", currency: "data.currency" } },
            start: { name: META_EVENT_NAME["lead start"], data: { value: "data.value", currency: "data.currency" } },
          },
        },
      },
    };
  }

  const amplitudeKey = process.env.AMPLITUDE_API_KEY;
  if (amplitudeKey) {
    dests.amplitude = {
      code: destinationAPI,
      config: {
        consent: { analytics: true },
        settings: {
          url: AMPLITUDE_URL,
          headers: { "Content-Type": "application/json" },
          // Full event → Amplitude HTTP V2. event_properties = globals + data only, so the PII
          // living in event.user never reaches Amplitude. device_id from the durable eid.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transform: (ev: any) => JSON.stringify({
            api_key: amplitudeKey,
            events: [{
              event_type: AMPLITUDE_EVENT_NAME[ev.name] || ev.name,
              device_id: ev.user?.device || ev.user?.id,
              insert_id: ev.id,
              time: Date.now(),
              event_properties: Object.assign({}, ev.globals, ev.data),
            }],
          }),
        },
      },
    };
  }

  // Google Ads is client-side now (gtag enhanced conversions in shared/walker.js), not here.
  return dests;
}

// Forward a lead event through the walkerOS server collector to Meta CAPI / Amplitude / Google
// Ads. No-op off the production domains and unless the visitor granted analytics consent (qed.js
// sends d._consent / d._consentCategories; see shared/consent.js). `event` is a walker name:
// "lead start" (step 1 partial) or "lead complete" (step 2 full).
export async function sendLeadEvent(event: string, d: Dict, page: string): Promise<void> {
  if (!analyticsEnabled(d._url)) return;
  if (d._consent !== "granted") return; // analytics gate — measurement

  const dests = serverDestinations();
  if (!Object.keys(dests).length) return; // nothing configured for this site → inert

  // Marketing gate: ad-match identity is attached ONLY when the "marketing" category was granted
  // — belt-and-braces on top of each destination's own marketing consent requirement.
  let marketing = false;
  try { marketing = !!JSON.parse(d._consentCategories || "{}").marketing; } catch { /* no categories → denied */ }

  const language = (d.lang || "EN").toLowerCase();
  // globals: same values + casing as the browser walker so client and server roll up together.
  const globals = {
    brand: (process.env.BRAND || "DEV").toUpperCase(),
    site: language === "es" ? "tardeo-de-trivia" : "quiz-eat-drink",
    language,
    page_type: "landing",
    section: page,
    product: PRODUCT_BY_PAGE[page] || page,
    env: "production",
  };

  // data: NON-PII only (reaches Amplitude + Meta value/currency). snake_case per the plan.
  const data: Record<string, unknown> = {
    funnel: page,
    product: PRODUCT_BY_PAGE[page] || page,
    step: event === "lead start" ? 1 : 2,
    value: LEAD_VALUE[page] || 1,
    currency: "EUR",
    city: normalizeCity(d.city),
    event_type: d.eventType,
    format: d.format,
    group_size: d.groupSize,
    date: d.date,
    guest_of_honour: d.guestOfHonour,
    venue_name: d.venueName,
    nights: d.nights,
    venue_situation: d.venueSituation,
    premises_location: d.premisesLocation,
  };
  // First-touch attribution — campaign ids, not personal data, so they ride the analytics gate.
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "wbraid", "gbraid", "fbclid", "msclkid", "ttclid", "ref"]) {
    const v = d["_" + k]; if (v) data[k] = v;
  }
  for (const k of Object.keys(data)) if (data[k] == null || data[k] === "") delete data[k];

  // user: identity for ad matching, attached ONLY under marketing consent. Raw values — Meta and
  // Google hash em/ph themselves. device/id = the durable eid (Amplitude device_id / CAPI
  // external_id). Amplitude ignores everything here except device/id.
  const user: Record<string, unknown> = {};
  if (d._eid) { user.id = d._eid; user.device = d._eid; }
  if (marketing) {
    if (d.email) user.email = d.email;
    if (d.phone) user.phone = normalizePhone(d.phone, d.phoneDial);
    if (d.firstName) user.firstName = d.firstName;
    if (d.lastName) user.lastName = d.lastName;
    if (d.city) user.city = normalizeCity(d.city);
    if (d._fbc) user.fbc = d._fbc;
    if (d._fbp) user.fbp = d._fbp;
    if (d._fbclid) user.fbclid = d._fbclid;
    if (d._gclid) user.gclid = d._gclid;
    if (d._ip) user.ip = d._ip;
    if (d._ua) user.ua = d._ua;
  }

  try {
    // Per-request collector (low lead volume). Consent set here gates destinations; the event id
    // is the submission's _event_id so the Meta CAPI Lead dedups against the browser Pixel Lead.
    const flow = await startFlow({
      consent: { analytics: true, marketing },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      destinations: dests as any,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (flow.elb as any)({ name: event, id: d._event_id, data, user, globals });
  } catch (err) {
    console.error("walker server send threw:", err);
  }
}

// ---- QED client portal: the CRM record --------------------------------------
// Telegram is an alert and Brevo is a mailing list. Neither is a record anybody can
// filter, assign an owner to, or count, which is why "did we ever reply to that venue
// in Murcia" has until now been answered by scrolling a chat. This posts the same lead
// to the portal, which keeps it in portal_lead behind the CRM's permission levels.
//
// Non-blocking and inert-safe, exactly like the walker destinations: with no env set
// nothing sends and nothing throws. It joins the existing Promise.allSettled, and only
// the Telegram result is ever inspected, so a portal outage can never fail a real
// submission. The 2.5s timeout sits well inside Netlify's 10s budget.
//
// PRIVACY: _fbc, _fbp and _eid are stripped before sending and are NOT forwarded. They
// are cross-site advertising identifiers whose only purpose is conversion matching, and
// that matching has already happened above, in sendLeadEvent. Copying them into a CRM
// that city and venue staff can open would turn ad data into a person-level tracking
// record held longer and read by more people, for no sales purpose.
const PORTAL_TIMEOUT_MS = 2500;
const PORTAL_DROP_FIELDS = ["_fbc", "_fbp", "_eid"];

export async function sendToPortal(d: Dict, page: string): Promise<void> {
  const url = process.env.PORTAL_INTAKE_URL;
  const secret = process.env.PORTAL_INTAKE_SECRET;
  // Inert when unconfigured. Deliberately not an error: a brand or a preview deploy
  // without portal credentials should keep working exactly as it did before.
  if (!url || !secret) return;

  const payload: Dict = {};
  for (const [k, v] of Object.entries(d)) {
    if (!PORTAL_DROP_FIELDS.includes(k)) payload[k] = v;
  }

  // Derived once, here, rather than a third time in the portal. forms.ts already owns
  // these three for the walker event and they should not drift into two answers.
  payload.page = page;
  payload.product = PRODUCT_BY_PAGE[page] || page;
  payload.citySlug = normalizeCity(d.city);
  // LEAD_VALUE is a relative bidding weight in euros, not a deal size. The portal keeps
  // it in integer cents, because every money column in that codebase is integer cents.
  payload.bidWeightCents = String((LEAD_VALUE[page] || 1) * 100);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-portal-intake-secret": secret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(PORTAL_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("Portal intake failed:", res.status, await res.text());
    }
  } catch (err) {
    // Logged, never rethrown. The lead is already safely in Telegram and Brevo.
    console.error("Portal intake threw:", err);
  }
}
