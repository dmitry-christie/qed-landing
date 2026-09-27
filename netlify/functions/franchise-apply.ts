// Partners (franchise) application. Forwards to Telegram + walkerOS (Meta CAPI + Amplitude + Google Ads) + Brevo.
import type { Handler } from "@netlify/functions";
import {
  clean, displayPhone, isConsentReplay, isEmail, isTooFast, json, leadValue, MAX_BODY, metaLine, partialLeadText,
  sendConsentReplay, sendLeadEvent, sendPartialTelegram, sendPartialToBrevo, sendTelegram, sendToBrevo, sendToPortal,
} from "../lib/forms";

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
  if (isTooFast(d)) return json(200, { ok: true });
  d._ua = event.headers["user-agent"] || "";
  d._ip = event.headers["x-nf-client-connection-ip"] || "";

  for (const field of ["firstName", "lastName", "email", "city"]) {
    if (!d[field]) return json(400, { ok: false, error: `Missing required field: ${field}` });
  }
  if (!isEmail(d.email)) return json(400, { ok: false, error: "Please enter a valid email address." });

  const page = d.page || "partners";

  // Consent replay (shared/qed.js): the same lead again, sent only for its analytics event
  // because it first went out before the visitor had accepted. Nothing else runs twice.
  if (isConsentReplay(d)) {
    await sendConsentReplay(d, page);
    return json(200, { ok: true });
  }

  // step 1 = partial submit, fire-and-forget from the client (shared/qed.js): walkerOS
  // `lead start` (distinct from step 2's `lead complete`, so a Lead conversion can never
  // include abandoners, see CLAUDE.md Analytics), one short "not finished" Telegram ping,
  // and the Brevo partial (contact + one reminder in 2h, cancelled if step 2 lands). None of
  // these can fail the response. Partials are not forwarded to the portal.
  if (d._step === "1") {
    await Promise.allSettled([
      sendLeadEvent("lead start", d, page),
      sendPartialTelegram(partialLeadText(d, page, `📍 City / area: ${d.city}`)),
      sendPartialToBrevo(d, page),
    ]);
    return json(200, { ok: true });
  }

  const text = [
    "🤝 New Franchise Application",
    `📍 City / area: ${d.city}`,
    `🏠 Venues: ${d.venueSituation || "—"}`,
    `📍 Premises: ${d.premisesLocation || "—"}`,
    `👤 Name: ${d.firstName} ${d.lastName}`,
    `📧 Email: ${d.email}`,
    `📱 Phone: ${displayPhone(d)}`,
    "💬 About:",
    d.about || d.message || "—",
    metaLine(d, page),
  ].join("\n");

  const [telegramResult] = await Promise.allSettled([
    sendTelegram(text),
    sendLeadEvent("lead complete", d, page),
    sendToBrevo(d, page, text),
    // The CRM record. Non-blocking and inert without env; see sendToPortal.
    sendToPortal(d, page),
  ]);
  const sent = telegramResult.status === "fulfilled" && telegramResult.value;
  if (!sent) return json(500, { ok: false, error: "Could not send right now. Please email info@quizeatdrink.com." });

  // value = the expected-value weight this lead was reported with server-side (CAPI), so the
  // browser Pixel Lead (shared/qed.js) sends the same number for the deduped pair.
  return json(200, { ok: true, value: leadValue(page, d.city) });
};
