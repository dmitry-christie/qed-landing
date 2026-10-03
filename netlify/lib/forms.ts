// Shared helpers for the QED lead-capture functions.
// All three functions (book-event, franchise-apply, venue-apply) reuse these:
// sanitize input, send a plain-text Telegram message, and fire a Meta CAPI event.
import { randomUUID } from "node:crypto";
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
  const base = `🌐 Lang: ${d.lang || "—"} | Country: ${d.country || "—"} | Page: ${page}${d._variant ? ` | v=${d._variant}` : ""}`;
  const hasAttr = d._utm_source || d._utm_campaign || d._utm_content || d._gclid || d._wbraid || d._gbraid || d._fbclid || d._ref;
  if (!hasAttr) return base;
  const src = d._utm_source || d._ref || "direct";
  const medium = d._utm_medium || (d._gclid || d._wbraid || d._gbraid ? "cpc" : d._fbclid ? "paid_social" : "—");
  const campaign = d._utm_campaign || "—";
  const clicks = [d._gclid && "gclid", (d._wbraid || d._gbraid) && "wbraid", d._fbclid && "fbclid"].filter(Boolean).join("·");
  const ad = d._utm_content ? ` | ad: ${d._utm_content}` : "";
  return `${base}\n📣 Source: ${src} / ${medium} / ${campaign}${clicks ? ` · ${clicks}` : ""}${ad}`;
}

// "+34 963 12 34 56" for the Telegram message — same best-effort spirit as
// normalizePhone: d.phoneDial is only there for submissions that went through the
// country selector, so this just degrades to the raw digits when it's missing.
export function displayPhone(d: Dict): string {
  if (!d.phone) return "—";
  const n = nationalDigits(d.phone, d.phoneDial);
  if (d.phoneDial === "34" && n.length === 9) return `+34 ${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7)}`;
  return d.phoneDial ? `+${d.phoneDial} ${n}` : d.phone;
}

// The national number: digits only, minus a typed or autofilled "+<dial>" / "00<dial>" prefix.
// Mirrors phoneDigits() in shared/qed.js, so the client check and this one agree.
export function nationalDigits(phone: string, dial?: string): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (dial && /^\d{1,4}$/.test(dial)) {
    if (digits.startsWith(`00${dial}`)) digits = digits.slice(dial.length + 2);
    else if (digits.startsWith(dial)) digits = digits.slice(dial.length);
  }
  return digits;
}

// Required phone on the contact-first corporate form. Spain: 9 digits starting with 6, 7, 8 or
// 9. Anywhere else: 7-14 digits. A missing dial code is read as Spain (the default selector).
export function isPhone(phone: string, dial?: string): boolean {
  const d = dial && /^\d{1,4}$/.test(dial) ? dial : "34";
  const n = nationalDigits(phone, d);
  return d === "34" ? /^[6-9]\d{8}$/.test(n) : n.length >= 7 && n.length <= 14;
}

// E.164 ("+34600123456") for Brevo's SMS attribute; "" when there is no usable number.
function e164Phone(d: Dict): string {
  const n = nationalDigits(d.phone || "", d.phoneDial);
  if (!n) return "";
  const dial = d.phoneDial && /^\d{1,4}$/.test(d.phoneDial) ? d.phoneDial : n.length === 9 ? "34" : "";
  return `+${dial}${n}`;
}

// Worst case (all attempts fail) must fit under Netlify's 10s synchronous function
// limit so the LOST LEAD log line actually gets a chance to emit: 3 * 2500ms timeout +
// (500 + 1000)ms backoff = 9s.
const TELEGRAM_TIMEOUT_MS = 2500;
const TELEGRAM_MAX_ATTEMPTS = 3;
const TELEGRAM_RETRY_DELAY_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Resolves to the sent message's id (0 if Telegram didn't return one), or null on failure.
async function sendTelegramOnce(token: string, chatId: string, text: string, replyTo?: number): Promise<number | null> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      // A reply to a message that's gone still sends, just unthreaded.
      ...(replyTo ? { reply_parameters: { message_id: replyTo, allow_sending_without_reply: true } } : {}),
    }),
    signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
  });
  if (!res.ok) {
    console.error("Telegram sendMessage failed:", res.status, await res.text());
    return null;
  }
  const j = await res.json().catch(() => null);
  return Number(j?.result?.message_id) || 0;
}

// POST a plain-text message to the Telegram group. No parse_mode (plain text).
// Telegram rejects messages over 4096 chars, so truncate rather than drop the lead.
// Retries a couple of times (transient network blips / Telegram hiccups) before giving
// up. On final failure, logs the full message under a distinct "LOST LEAD" marker —
// this is the only durable copy of the alert at that point, so it needs to be grep/
// alertable from Netlify function logs rather than silently swallowed.
// The step-1 "started, not finished" ping passes attempts=1 and its own marker: it's a
// heads-up, the partial also lands in Brevo, and it must not trip a LOST LEAD alert.
export async function sendTelegram(text: string, attempts = TELEGRAM_MAX_ATTEMPTS, lostMarker = "LOST LEAD"): Promise<boolean> {
  return (await sendTelegramMessage(text, { attempts, lostMarker })) !== null;
}

type TelegramOpts = { attempts?: number; lostMarker?: string; chatId?: string; replyTo?: number };

// sendTelegram, but resolves to the message id (null on failure), with an optional chat and a
// message to reply to. The contact-first call alerts use it: the step-2 details and any
// correction thread under the first alert, whose id the client holds as _tgRef.
export async function sendTelegramMessage(text: string, opts: TelegramOpts = {}): Promise<number | null> {
  const attempts = opts.attempts ?? TELEGRAM_MAX_ATTEMPTS;
  const lostMarker = opts.lostMarker ?? "LOST LEAD";
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = opts.chatId || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars.");
    console.error(`${lostMarker} (Telegram not configured):`, text);
    return null;
  }
  if (text.length > 4000) text = text.slice(0, 4000) + "…";

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const id = await sendTelegramOnce(token, chatId, text, opts.replyTo);
      if (id !== null) return id;
    } catch (err) {
      console.error(`Telegram sendMessage threw (attempt ${attempt}/${attempts}):`, err);
    }
    if (attempt < attempts) await sleep(TELEGRAM_RETRY_DELAY_MS * attempt);
  }

  console.error(`${lostMarker} (Telegram failed after retries):`, text);
  return null;
}

// Step 1 = name + email (+ city on the franchise form, event type on the events forms).
// One short message, clearly not a lead yet, so the founders can tell it apart from the
// full "New ..." alert that follows if the visitor finishes. `detail` is the one funnel-
// specific line (event type / city / venue).
const PARTIAL_LABEL: Record<string, string> = {
  corporate: "Corporate event",
  celebrations: "Celebration",
  venues: "Venue",
  partners: "Franchise",
};

export function partialLeadText(d: Dict, page: string, detail: string): string {
  return [
    `⏳ Started, not finished (step 1): ${PARTIAL_LABEL[page] || page}`,
    `👤 Name: ${d.firstName} ${d.lastName}`,
    `📧 Email: ${d.email}`,
    detail,
    metaLine(d, page),
  ].join("\n");
}

export function sendPartialTelegram(text: string): Promise<boolean> {
  return sendTelegram(text, 1, "LOST PARTIAL");
}

// ---- Contact-first call alerts (corporate) ----------------------------------
// Step 1 of the corporate form is a call-back request: name, phone, email, event type. The alert
// is the call queue until the portal takes over, so it leads with who to call and by when, and
// mentions whoever calls that language (TELEGRAM_CALL_MENTION_ES / _EN, e.g. "@handle", kept in
// env rather than code). It goes to TELEGRAM_CALL_CHAT_ID when set (keep that chat to the people
// who call: it holds phone numbers), else the usual TELEGRAM_CHAT_ID.

// Call-by target, Madrid time: two hours after the lead inside working hours (Mon-Fri
// 10:00-19:00), never later than 19:00; before 10:00 it's 11:00 that day; after 19:00 or at the
// weekend it's 11:00 the next working day. Public holidays aren't known here. The copy promises
// "the same working day"; this is only the internal target the alert shows.
const CALL_TZ = "Europe/Madrid";
const CALL_OPEN = 10 * 60, CALL_CLOSE = 19 * 60, CALL_NEXT_DAY = 11 * 60, CALL_SLA = 120;
const DOW_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DOW_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function madridNow(now: Date): { y: number; m: number; d: number; dow: number; min: number } {
  const p: Record<string, string> = {};
  for (const x of new Intl.DateTimeFormat("en-GB", {
    timeZone: CALL_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now)) p[x.type] = x.value;
  const y = Number(p.year), m = Number(p.month), d = Number(p.day);
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), min: Number(p.hour) * 60 + Number(p.minute) };
}

export function callByLine(es: boolean, now = new Date()): string {
  const t = madridNow(now);
  const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const hours = es ? "(L-V 10-19 h)" : "(Mon-Fri 10:00-19:00 Spain)";
  const workday = t.dow >= 1 && t.dow <= 5;
  if (workday && t.min < CALL_CLOSE) {
    const by = t.min < CALL_OPEN ? CALL_NEXT_DAY : Math.min(t.min + CALL_SLA, CALL_CLOSE);
    return es ? `Llamar antes de las ${hhmm(by)} ${hours}` : `Call by ${hhmm(by)} ${hours}`;
  }
  const next = new Date(Date.UTC(t.y, t.m - 1, t.d));
  do next.setUTCDate(next.getUTCDate() + 1); while (next.getUTCDay() === 0 || next.getUTCDay() === 6);
  const day = next.getUTCDate(), dow = next.getUTCDay();
  return es
    ? `Llamar antes de las ${hhmm(CALL_NEXT_DAY)} del ${DOW_ES[dow]} ${day} ${hours}`
    : `Call by ${hhmm(CALL_NEXT_DAY)} on ${DOW_EN[dow]} ${day} ${hours}`;
}

function isEs(d: Dict): boolean {
  return (d.lang || "").toUpperCase() === "ES";
}

export function callChatId(): string | undefined {
  return process.env.TELEGRAM_CALL_CHAT_ID || undefined;
}

export function callAlertText(d: Dict, page: string, now = new Date()): string {
  const es = isEs(d);
  const label = page === "corporate" ? (es ? "Empresa" : "Corporate") : (PARTIAL_LABEL[page] || page);
  const mention = process.env[es ? "TELEGRAM_CALL_MENTION_ES" : "TELEGRAM_CALL_MENTION_EN"];
  return [
    `📞 ${es ? "LLAMAR" : "CALL"} [${brandTag()}] ${label} · ${d.eventType}`,
    `👤 ${d.firstName}   📱 ${displayPhone(d)}`,
    `📧 ${d.email}`,
    `⏱ ${callByLine(es, now)}`,
    ...(mention ? [mention] : []),
    metaLine(d, page),
  ].join("\n");
}

// Reply under the call alert: the visitor fixed their phone or email from step 2's Edit link.
export function correctionText(d: Dict): string {
  const es = isEs(d);
  const prev = d._prevEmail && d._prevEmail !== (d.email || "").toLowerCase() ? ` (${es ? "antes" : "was"}: ${d._prevEmail})` : "";
  return [
    `✏️ ${es ? "Corrección" : "Correction"}`,
    `👤 ${d.firstName}   📱 ${displayPhone(d)}`,
    `📧 ${d.email}${prev}`,
  ].join("\n");
}

// Reply under the call alert with whatever step 2 filled in.
export function detailsText(d: Dict): string {
  const es = isEs(d);
  const rows: [string, string, string | undefined][] = [
    ["👥", es ? "Personas" : "People", d.groupSize],
    ["📅", es ? "Fecha" : "Date", d.date],
    ["📍", es ? "Ciudad" : "City", d.city],
    ["🍽", es ? "Restaurante" : "Restaurant", d.restaurant],
    ["🎭", es ? "Formato" : "Format", d.format],
    ["🏢", es ? "Empresa" : "Company", d.company],
    ["👤", es ? "Apellidos" : "Last name", d.lastName],
    ["💬", es ? "Mensaje" : "Message", d.message],
  ];
  const filled = rows.filter(([, , v]) => v);
  return [
    `➕ ${es ? "Detalles" : "Details"}: ${d.firstName} · ${d.email}`,
    ...(filled.length ? filled.map(([i, k, v]) => `${i} ${k}: ${v}`) : [es ? "(nada más)" : "(nothing else)"]),
  ].join("\n");
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
// sendToBrevo runs on the full (step 2) submission: contact + deal + confirmation email.
// A step-1 partial goes through sendPartialToBrevo instead (contact + one scheduled
// reminder, no deal, never the funnel list) — see the partial-lead section below.
//
// NOTE: Brevo rejects unknown custom attributes, so before this goes live create these
// contact attributes in Brevo (Contacts > Settings > Contact attributes, type "Text"):
// LEAD_CITY, LANG, LEAD_SOURCE, UTM_SOURCE, UTM_CAMPAIGN, UTM_CONTENT, NOTES, LAST_DEAL,
// LEAD_STAGE, PARTIAL_NUDGE. FIRSTNAME/LASTNAME/SMS are built in (OPT_IN too, boolean). A missing list/attribute makes this
// fail silently (logged, non-blocking) — check Netlify function logs after setup to
// confirm it's actually landing contacts.
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

// No monetary "amount" is set — leadValue() below is an expected-value bidding signal
// (deal size x an assumed close rate), not this deal's size. Founders fill amount in once
// a lead is qualified, same as they'd do with a deal from any other source.
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
// Returns ok (the contact was saved, possibly minus `dropped` attributes) and the id,
// which Brevo only returns on create (201), not on update (204).
type BrevoUpsert = { ok: boolean; id?: number; dropped: string[] };

async function upsertBrevoContact(
  headers: Record<string, string>,
  email: string,
  attributes: Record<string, string>,
  listId: number | undefined,
  dropped: string[] = [],
): Promise<BrevoUpsert> {
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
      return { ok: true, id: (await res.json().catch(() => null))?.id, dropped };
    }
    if (res.ok) return { ok: true, dropped };
    const errText = await res.text();
    console.error("Brevo contact upsert failed:", res.status, errText);
    const badAttr = Object.keys(attributes).find((k) => new RegExp(k, "i").test(errText));
    if (badAttr) {
      console.error(`Retrying Brevo contact upsert without ${badAttr} (attribute type mismatch in Brevo dashboard — fix its type there).`);
      const rest = { ...attributes };
      delete rest[badAttr];
      return upsertBrevoContact(headers, email, rest, listId, [...dropped, badAttr]);
    }
  } catch (err) {
    console.error("Brevo contact upsert threw:", err);
  }
  return { ok: false, dropped };
}

// Deals aren't deduplicated by Brevo, and paid traffic draws bots that render JS/CSS well
// enough to dodge the honeypot and timing check some of the time — a burst of retries (bot
// or human double-click/back-button) would otherwise create a fresh deal on every hit.
// Stashed on the contact itself as "<page>:<epoch ms>" rather than queried from Brevo's
// deals search API, since Contacts is the one endpoint this integration already depends on
// and knows works. Needs a LAST_DEAL Text attribute in Brevo (see setup note above) — until
// then this attribute is just dropped same as any other misconfigured one, and dedupe no-ops.
const DEAL_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

type BrevoContact = { id?: number; attributes?: Record<string, unknown> };

async function getBrevoContact(headers: Record<string, string>, email: string): Promise<BrevoContact | undefined> {
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

function brevoAttr(contact: BrevoContact | undefined, key: string): string {
  const v = contact?.attributes?.[key];
  return typeof v === "string" ? v : "";
}

// True when this contact got a deal for `page` within DEAL_DEDUPE_WINDOW_MS (LAST_DEAL is
// "<page>:<epoch ms>"). Step 2 uses it to skip a duplicate deal; step 1 uses it to skip
// the reminder for someone who has just finished that same form.
function recentDealFor(contact: BrevoContact | undefined, page: string): boolean {
  const lastDeal = brevoAttr(contact, "LAST_DEAL");
  const cut = lastDeal.lastIndexOf(":");
  const ts = Number(lastDeal.slice(cut + 1));
  return cut > 0 && lastDeal.slice(0, cut) === page && Number.isFinite(ts) && Date.now() - ts < DEAL_DEDUPE_WINDOW_MS;
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

// opts.stage: LEAD_STAGE to write ("complete" by default; the contact-first corporate step 1
// writes "contact", which templates #7/#8 branch on for the call-back wording).
// opts.deal = false: no deal and no LAST_DEAL bump, only the contact and the confirmation. A
// contact-first correction uses it: the deal already exists under the mistyped address.
type BrevoOpts = { stage?: string; deal?: boolean };

export async function sendToBrevo(d: Dict, page: string, notes: string, opts: BrevoOpts = {}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("Missing BREVO_API_KEY env var.");
    return;
  }
  if (!d.email) return;

  const headers = { "Content-Type": "application/json", Accept: "application/json", "api-key": apiKey };
  const existing = await getBrevoContact(headers, d.email);
  const dupeDeal = recentDealFor(existing, page);
  // They finished, so the step-1 reminder scheduled by sendPartialToBrevo must not go out: the
  // one this form's step 1 scheduled (the client sends its id back as _nudge, so this works even
  // when the lookup above found nothing) and any other still stored on the contact.
  const storedNudge = brevoAttr(existing, "PARTIAL_NUDGE");
  const nudges = [...new Set([nudgeId(d._nudge), storedNudge].filter((v): v is string => !!v))];
  const cancelled = await Promise.all(nudges.map((id) => cancelBrevoNudge(apiKey, id)));

  const attributes: Record<string, string> = { LEAD_SOURCE: page, LEAD_STAGE: opts.stage || "complete" };
  // Clear the stored id only once its reminder is gone (cancelled, or already sent). After a
  // failed cancel (timeout / 5xx) it stays, so a later submission can still cancel it.
  if (storedNudge && cancelled[nudges.indexOf(storedNudge)]) attributes.PARTIAL_NUDGE = "";
  if (d.firstName) attributes.FIRSTNAME = d.firstName;
  if (d.lastName) attributes.LASTNAME = d.lastName;
  const sms = e164Phone(d);
  if (sms) attributes.SMS = sms;
  if (d.city) attributes.LEAD_CITY = d.city;
  if (d.lang) attributes.LANG = d.lang.toUpperCase();
  if (d._utm_source) attributes.UTM_SOURCE = d._utm_source;
  if (d._utm_campaign) attributes.UTM_CAMPAIGN = d._utm_campaign;
  if (d._utm_content) attributes.UTM_CONTENT = d._utm_content;
  attributes.NOTES = notes.slice(0, 1800);

  const listId = brevoListId(page);
  const upserted = await upsertBrevoContact(headers, d.email, attributes, listId);
  let contactId = existing?.id ?? upserted.id;
  // Brevo returns the id only on create (201). A contact that appeared between the lookup above
  // and the upsert (a step 1 landing in between) comes back 204 without one: look it up again,
  // or the confirmation email is skipped and the deal is created unlinked.
  if (!contactId && upserted.ok) contactId = (await getBrevoContact(headers, d.email))?.id;

  if (dupeDeal) {
    console.error("Skipping duplicate Brevo deal:", page, d.email);
    return;
  }
  await sendBrevoFollowupEmail(apiKey, d, contactId);
  if (opts.deal === false) return;
  const dealCreated = await createBrevoDeal(apiKey, d, page, notes, contactId);
  // Only bump LAST_DEAL once the deal actually exists — bumping it up front would make a
  // failed deal create (timeout/5xx) look like a real one, silently suppressing the
  // resubmission that would otherwise retry it within the dedupe window.
  if (dealCreated) {
    await upsertBrevoContact(headers, d.email, { LAST_DEAL: `${page}:${Date.now()}` }, listId);
  }
}

// Contact-first step 2 (corporate): the optional details, onto the contact step 1 created.
// Only updates attributes: never a deal, a list or an email, whatever the timing (the 30-minute
// deal dedupe above would not cover a visitor who comes back later). Resolves true when Brevo
// saved it, so the function can answer 200 if either this or Telegram worked.
export async function enrichBrevo(d: Dict, notes: string): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("Missing BREVO_API_KEY env var.");
    return false;
  }
  if (!d.email) return false;
  const headers = { "Content-Type": "application/json", Accept: "application/json", "api-key": apiKey };
  const attributes: Record<string, string> = { LEAD_STAGE: "complete", NOTES: notes.slice(0, 1800) };
  if (d.lastName) attributes.LASTNAME = d.lastName;
  if (d.city) attributes.LEAD_CITY = d.city;
  return (await upsertBrevoContact(headers, d.email, attributes, undefined)).ok;
}

// ---- Step-1 partial leads: contact + ONE reminder email ----------------------
// Step 1 already has name + email (+ city / event type). Someone who stops there gets one
// reminder 2 hours later, and step 2 cancels it if they finish first. Legal basis: steps
// taken at the person's request / legitimate interest, disclosed by the form.privacy line
// under every step-1 Continue button. No deal, no confirmation email, no portal record,
// and never the funnel's main list (that list means "a real enquiry").
//
// The reminder is a Brevo transactional email sent with scheduledAt. Its batchId (UUIDv4) is
// ours, not Brevo's: the browser generates it at step 1 and sends it as _nudge on both steps
// (a random one here if it's missing or malformed), and it is stored on the contact as
// PARTIAL_NUDGE BEFORE scheduling. DELETE /v3/smtp/email/{identifier} accepts either the
// batchId or the messageId, and the scheduled-send response body is undocumented ("202: any"),
// so owning the id up front is the only way to be sure step 2 can always cancel it, even when
// step 2's contact lookup runs before step 1 has saved anything. If scheduling then fails,
// the id points at nothing and the cancel just 404s (ignored).
//
// Templates #10 "TdT Partial Nudge - ES" (TDT sender) and #11 "QED Partial Nudge - EN"
// (QED sender) branch on contact.LEAD_SOURCE and read FIRSTNAME / LEAD_CITY, so the
// contact is upserted first. Picked by LANG, same rule as the confirmation email.
// Optional env: BREVO_LIST_ID_PARTIAL_<PAGE> or BREVO_LIST_ID_PARTIAL (no list if unset).
const BREVO_NUDGE_TEMPLATE_ID_ES = 10;
const BREVO_NUDGE_TEMPLATE_ID_EN = 11;
const PARTIAL_NUDGE_DELAY_MS = 2 * 60 * 60 * 1000; // Brevo allows scheduling up to 72h ahead

function brevoPartialListId(page: string): number | undefined {
  const id = Number(process.env[`BREVO_LIST_ID_PARTIAL_${page.toUpperCase()}`] || process.env.BREVO_LIST_ID_PARTIAL);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

// Cancel a scheduled reminder by its batchId (PARTIAL_NUDGE, or the client's _nudge). 404 =
// already sent or never scheduled, which is fine. Returns true when the reminder is gone either
// way, false when the cancel itself failed. Logged, never thrown.
async function cancelBrevoNudge(apiKey: string, id: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.brevo.com/v3/smtp/email/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Accept: "application/json", "api-key": apiKey },
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });
    if (res.ok || res.status === 404) return true;
    console.error("Brevo reminder cancel failed:", res.status, await res.text());
  } catch (err) {
    console.error("Brevo reminder cancel threw:", err);
  }
  return false;
}

// The client (shared/qed.js) generates the reminder's batchId at step 1 and sends it as _nudge
// on both steps (and the previous one as _nudgeCancel after an email correction). Only a
// well-formed UUID is used, as the batchId or in a cancel URL.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function nudgeId(v: string | undefined): string | undefined {
  return v && UUID_RE.test(v) ? v.toLowerCase() : undefined;
}

export async function sendPartialToBrevo(d: Dict, page: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("Missing BREVO_API_KEY env var.");
    return;
  }
  if (!d.email) return;

  try {
    const headers = { "Content-Type": "application/json", Accept: "application/json", "api-key": apiKey };
    const existing = await getBrevoContact(headers, d.email);

    // Re-starting resets the clock: drop the reminder from an earlier step 1 on this contact
    // and, after an email correction, the one scheduled for the previous (mistyped) address.
    const batchId = nudgeId(d._nudge) || randomUUID();
    const stale = new Set([brevoAttr(existing, "PARTIAL_NUDGE"), nudgeId(d._nudgeCancel)].filter((v): v is string => !!v && v !== batchId));
    await Promise.all([...stale].map((id) => cancelBrevoNudge(apiKey, id)));

    // Just finished this same form (step 2 landed first, or they came back to it): no reminder.
    if (recentDealFor(existing, page)) return;

    const attributes: Record<string, string> = { LEAD_SOURCE: page, LEAD_STAGE: "partial", PARTIAL_NUDGE: batchId };
    if (d.firstName) attributes.FIRSTNAME = d.firstName;
    if (d.lastName) attributes.LASTNAME = d.lastName;
    if (d.city) attributes.LEAD_CITY = d.city;
    if (d.lang) attributes.LANG = d.lang.toUpperCase();
    if (d._utm_source) attributes.UTM_SOURCE = d._utm_source;
    if (d._utm_campaign) attributes.UTM_CAMPAIGN = d._utm_campaign;
    if (d._utm_content) attributes.UTM_CONTENT = d._utm_content;

    const saved = await upsertBrevoContact(headers, d.email, attributes, brevoPartialListId(page));
    // Without a stored PARTIAL_NUDGE, step 2 couldn't cancel it: better no reminder than
    // one that lands after they've finished.
    if (!saved.ok || saved.dropped.includes("PARTIAL_NUDGE")) {
      console.error("Skipping partial reminder: contact not saved with PARTIAL_NUDGE.", page);
      return;
    }

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers,
      body: JSON.stringify({
        templateId: d.lang?.toUpperCase() === "ES" ? BREVO_NUDGE_TEMPLATE_ID_ES : BREVO_NUDGE_TEMPLATE_ID_EN,
        to: [{ email: d.email }],
        scheduledAt: new Date(Date.now() + PARTIAL_NUDGE_DELAY_MS).toISOString(),
        batchId,
      }),
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("Brevo reminder schedule failed:", res.status, await res.text());
      return;
    }
    // Step 2 can still overtake this one (the client waits for step 1, but only so long): if the
    // same lead has finished in the meantime, its cancel may have come before this schedule.
    const after = await getBrevoContact(headers, d.email);
    const finished = (!saved.dropped.includes("LEAD_STAGE") && brevoAttr(after, "LEAD_STAGE") === "complete") || recentDealFor(after, page);
    if (finished) await cancelBrevoNudge(apiKey, batchId);
  } catch (err) {
    console.error("Brevo partial lead threw:", err);
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

// ---- Lead value (EUR) for value-based bidding (Meta value optimization / Google tROAS) ----
// value = expected euros per COMPLETED lead = typical deal value x assumed lead-to-deal rate.
//   corporate      40 = B2B event ~270 € x ~12-15% paid close. Contact-first since Oct 2026:
//                       the lead is step 1 (name, phone, email, event type), not the full brief.
//   celebrations   30 = B2C private event ~150 € x ~20%
//   venues         50 = parked product, placeholder
//   partners      by the lead's city, ~5% lead-to-signed x first-year value per tier:
//                 large 250 (5,000 €) / medium 150 (3,000 €) / small or unknown 100 (2,000 €)
// `lead start` (step 1) carries LEAD_START_SHARE (20%) of the complete value.
// The close rates are ASSUMPTIONS, not measured; corporate and celebrations get recalibrated
// after the first 20 ad leads. Recalibrate once Brevo has a few months
// of won deals per funnel (value = average won deal x won / completed leads). Only the
// ratios between funnels steer the bidding, so keep them honest relative to each other.
// shared/qed.js mirrors the page defaults (partners -> the medium 150) for the browser
// events and prefers the value this function returns in the step-2 response.
const LEAD_START_SHARE = 0.2;
const PAGE_LEAD_VALUE: Record<string, number> = { corporate: 40, celebrations: 30, venues: 50 };
const PARTNER_TIER_VALUE = { large: 250, medium: 150, small: 100 };

// Spanish municipalities by population (INE padrón). Written accent-free, lowercase, with
// the usual Spanish / co-official / English variants. Matched as whole words inside the
// typed city, so "Madrid centro" and "L'Hospitalet de Llobregat" hit, "Lugones" doesn't
// read as Lugo. Anything containing a large name counts as large (the metro market).
const LARGE_CITIES = [ // >= 500k
  "madrid", "barcelona", "bcn", "barna", "valencia", "sevilla", "seville", "zaragoza", "saragossa", "malaga",
];
const MEDIUM_CITIES = [ // 100k-500k, plus the capitals just under the line (Lugo, Caceres, Santiago)
  "murcia", "palma", "mallorca", "majorca", "las palmas", "gran canaria", "bilbao", "bilbo", "alicante", "alacant",
  "cordoba", "valladolid", "vigo", "gijon", "xixon", "hospitalet", "hospitalet de llobregat", "vitoria", "gasteiz",
  "coruna", "corunna", "elche", "elx", "granada", "oviedo", "uvieu", "cartagena", "jerez", "jerez de la frontera",
  "santa cruz de tenerife", "tenerife", "pamplona", "iruna", "almeria", "san sebastian", "donostia",
  "burgos", "albacete", "castellon", "castello", "castellon de la plana", "castello de la plana", "santander", "la laguna", "logrono", "badajoz",
  "marbella", "salamanca", "huelva", "lleida", "lerida", "tarragona", "leon", "cadiz", "jaen",
  "ourense", "orense", "girona", "gerona", "lugo", "caceres", "santiago", "compostela", "algeciras",
  "reus", "telde", "barakaldo", "baracaldo", "roquetas", "roquetas de mar", "dos hermanas",
  // Madrid metro
  "mostoles", "alcala de henares", "fuenlabrada", "leganes", "getafe", "alcorcon", "torrejon", "torrejon de ardoz", "parla", "alcobendas",
  // Barcelona metro
  "badalona", "terrassa", "tarrasa", "sabadell", "mataro", "santa coloma de gramenet", "gramenet",
];

function cityWords(raw: string | undefined): string {
  if (!raw) return " ";
  return ` ${raw.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

// Small towns named after a big city: "Valencia de Alcántara", "Sevilla la Nueva", "Palma del
// Río", "Jerez de los Caballeros". A name followed by de / del / la + another word is taken as
// one of those, unless the whole longer name is listed itself ("jerez de la frontera", "alcala
// de henares"). The few that can't be told apart that way are listed as exceptions.
const HOMONYM_TAIL = /^(de|del|la) \S/;
const SMALL_HOMONYMS = ["la granada"]; // La Granada (Penedès), not Granada

function hasCity(s: string, c: string): boolean {
  const needle = ` ${c} `;
  for (let i = s.indexOf(needle); i !== -1; i = s.indexOf(needle, i + 1)) {
    if (!HOMONYM_TAIL.test(s.slice(i + needle.length))) return true;
  }
  return false;
}

export function partnerCityTier(city: string | undefined): "large" | "medium" | "small" {
  const s = cityWords(city);
  if (SMALL_HOMONYMS.some((c) => s.trim() === c)) return "small";
  if (LARGE_CITIES.some((c) => hasCity(s, c))) return "large";
  if (MEDIUM_CITIES.some((c) => hasCity(s, c))) return "medium";
  return "small";
}

// Expected value (EUR) of a completed lead on `page` from `city` (city only matters for partners).
export function leadValue(page: string, city?: string): number {
  if (page === "partners") return PARTNER_TIER_VALUE[partnerCityTier(city)];
  return PAGE_LEAD_VALUE[page] ?? PAGE_LEAD_VALUE.venues; // unknown page: lowest placeholder
}

export function leadStartValue(page: string, city?: string): number {
  return Math.round(leadValue(page, city) * LEAD_START_SHARE);
}

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
  // contact-first step 2 (corporate). Meta's mapping is an allowlist of start/complete, so only
  // Amplitude gets it.
  "lead details": "Lead Details Added",
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

const META_CUSTOM_DATA = { map: { custom_data: { map: { value: "data.value", currency: "data.currency" } } } };

// The page the lead was sent from, for Meta's event_source_url. Query string and hash are
// dropped: they carry click ids and UTMs, which Meta gets through fbc and the event data.
function sourceUrl(url: string | undefined): string | undefined {
  try {
    const u = new URL(url || "");
    return `${u.origin}${u.pathname}`;
  } catch {
    return undefined;
  }
}

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
          // No fbclid here on purpose: the destination turns a user_data.fbclid into a
          // fresh fbc stamped with the SEND time, overwriting the fbc qed.js already built
          // from the real click timestamp.
          user_data: {
            em: "user.email", ph: "user.phone", fn: "user.firstName", ln: "user.lastName",
            external_id: "user.id", ct: "user.city",
            fbc: "user.fbc", fbp: "user.fbp",
            client_ip_address: "user.ip", client_user_agent: "user.ua",
          },
        },
        // A rule's `data` must be a { map: {...} }: a bare { value: "data.value" } is read by
        // walkerOS as a STATIC value and resolves to the literal string "data.value", so the
        // conversion went out with no value. The destination spreads the mapped object into
        // the CAPI event, so value/currency go under custom_data, where Meta reads them.
        // event_source_url comes from event.source.url (set in sendLeadEvent).
        mapping: {
          "*": { "*": { ignore: true } }, // allowlist: only the lead events post to CAPI
          lead: {
            complete: { name: META_EVENT_NAME["lead complete"], data: META_CUSTOM_DATA },
            start: { name: META_EVENT_NAME["lead start"], data: META_CUSTOM_DATA },
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
              // Browser session start (epoch ms) from qed.js, so the lead joins the visitor's session.
              session_id: Number(ev.user?.session) || undefined,
              insert_id: ev.id,
              time: Date.now(),
              platform: "Web",
              library: "walkeros-server/4",
              user_agent: ev.user?.userAgent, // the visitor's browser UA, not the function's
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
// "lead start" (step 1 partial) or "lead complete" (step 2 full; step 1 on a contact-first form,
// d._capture "contact"), or "lead details" (contact-first step 2, Amplitude only).
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
    page_path: d.path, // same property the browser events carry
    step: event === "lead start" || (event === "lead complete" && d._capture === "contact") ? 1 : 2,
    value: event === "lead start" ? leadStartValue(page, d.city) : leadValue(page, d.city),
    currency: "EUR",
    city: normalizeCity(d.city),
    event_type: d.eventType,
    format: d.format,
    group_size: d.groupSize,
    date: d.date,
    restaurant: d.restaurant,
    variant: d._variant,
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
  // external_id). Amplitude reads only device/id, session and userAgent (analytics-level, set
  // before the marketing gate); Meta's user_data map never reads session/userAgent.
  const user: Record<string, unknown> = {};
  if (d._eid) { user.id = d._eid; user.device = d._eid; }
  if (d._sid) user.session = d._sid;
  if (d._ua) user.userAgent = d._ua;
  if (marketing) {
    if (d.email) user.email = d.email;
    if (d.phone) user.phone = normalizePhone(d.phone, d.phoneDial);
    if (d.firstName) user.firstName = d.firstName;
    if (d.lastName) user.lastName = d.lastName;
    if (d.city) user.city = normalizeCity(d.city);
    if (d._fbc) user.fbc = d._fbc;
    if (d._fbp) user.fbp = d._fbp;
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
    // source.url becomes Meta's event_source_url (the server destination reads it natively).
    const url = sourceUrl(d._url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (flow.elb as any)({ name: event, id: d._event_id, data, user, globals, source: { type: "collector", schema: "4", ...(url ? { url } : {}) } });
  } catch (err) {
    console.error("walker server send threw:", err);
  }
}

// A lead the visitor sent before choosing in the consent banner (consent.js holds it back while
// a lead form is on screen) reached its function with _consent "denied", so sendLeadEvent dropped
// its event. qed.js re-sends the same payload marked _replay:"consent" once they grant analytics;
// the functions answer it with this alone: no Telegram, Brevo or portal, which already ran. Same
// _event_id as the first POST, so Meta dedups it against the browser Pixel Lead and Amplitude on
// insert_id.
export function isConsentReplay(d: Dict): boolean {
  return d._replay === "consent";
}

// Contact-first (d._capture "contact"): step 1 is the `lead complete`, step 2 the `lead details`.
export async function sendConsentReplay(d: Dict, page: string): Promise<void> {
  const contact = d._capture === "contact";
  const event = d._step === "1" ? (contact ? "lead complete" : "lead start") : (contact ? "lead details" : "lead complete");
  await sendLeadEvent(event, d, page);
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
// submission. The timeout is explained under TIMING below.
//
// PRIVACY: _fbc, _fbp and _eid are stripped before sending and are NOT forwarded. They
// are cross-site advertising identifiers whose only purpose is conversion matching, and
// that matching has already happened above, in sendLeadEvent. Copying them into a CRM
// that city and venue staff can open would turn ad data into a person-level tracking
// record held longer and read by more people, for no sales purpose. _ip goes too: the
// portal refuses to store it, so there is no reason to send a visitor's address to a
// third system at all. The portal drops all four itself as well, so this is not the
// only line holding the refusal.
//
// TIMING: the intake makes four or five round trips to a database in Frankfurt, and a
// Supabase function runs in the region nearest its caller unless told otherwise, which
// for a Netlify function is usually the US. PORTAL_INTAKE_REGION (e.g. eu-central-1)
// pins it next to the database. The timeout is 6s rather than 2.5s because a cold start
// plus those round trips can pass 2.5s, and a lead that times out here is a lead missing
// from the CRM. It only bites when the portal is slow, and allSettled already waits on
// Brevo's sequential calls, each with its own 4s timeout, so this line does not set the
// worst case a visitor waits.
const PORTAL_TIMEOUT_MS = 6000;
// _nudge / _nudgeCancel are Brevo reminder ids (see sendPartialToBrevo), internal plumbing only.
const PORTAL_DROP_FIELDS = ["_fbc", "_fbp", "_eid", "_ip", "_nudge", "_nudgeCancel"];

export async function sendToPortal(d: Dict, page: string): Promise<void> {
  const url = process.env.PORTAL_INTAKE_URL;
  const secret = process.env.PORTAL_INTAKE_SECRET;
  // Inert when unconfigured. Deliberately not an error: a brand or a preview deploy
  // without portal credentials should keep working exactly as it did before.
  if (!url || !secret) return;
  const region = process.env.PORTAL_INTAKE_REGION;

  const payload: Dict = {};
  for (const [k, v] of Object.entries(d)) {
    if (!PORTAL_DROP_FIELDS.includes(k)) payload[k] = v;
  }

  // Derived once, here, rather than a third time in the portal. forms.ts already owns
  // these three for the walker event and they should not drift into two answers.
  payload.page = page;
  payload.product = PRODUCT_BY_PAGE[page] || page;
  payload.citySlug = normalizeCity(d.city);
  // leadValue() is an expected-value bidding weight in euros, not a deal size. The portal
  // keeps it in integer cents, because every money column in that codebase is integer cents.
  payload.bidWeightCents = String(leadValue(page, d.city) * 100);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-portal-intake-secret": secret,
        ...(region ? { "x-region": region } : {}),
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
