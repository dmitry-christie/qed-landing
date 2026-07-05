# QED Paid Acquisition Plan — Franchise, Venues & Private Events

**Date:** 2026-07-04 · **Source:** 20-agent verified audit (62 confirmed findings, 2 refuted) across 7 dimensions of the 5 landing pages, forms, functions, and build system.
**Goal:** launch Meta Ads (with CAPI) + Google Ads Search selling the franchise to event organisers and venue owners, plus private events (corporate + celebrations).

---

## Part 1 — State of play (TL;DR)

**The pages are good. The plumbing is not.** Hero copy, message match, honest stats, and the two-step forms are launch-quality on all four persona pages. What blocks spending money today:

1. **Zero client-side measurement.** No GTM, GA4, or Meta Pixel on any page. `lead_intent`/`lead_complete` push into a dataLayer nothing reads. Google Ads would run completely blind. *(critical)* — **Fix: RudderStack JS SDK, see updated Part 2 (2026-07-04 decision).**
2. **No lead attribution.** UTM/gclid/fbclid are never captured; Telegram (the de-facto CRM) shows identical messages for a €50-CPC lead and an organic one. Per-campaign lead quality is uncomputable. *(critical)*
3. **CAPI is half-built.** `fireMetaCapi` in `netlify/lib/forms.ts` already fires CompleteRegistration server-side, but the client never sends `_fbp/_fbc/_event_id/_url/_ua` — events go out with hashed email only (low EMQ, no dedup key), and the unawaited `void fetch` gets killed by Lambda freeze nondeterministically. *(high)* — **Superseded: replace the direct Graph API call with a server-side RudderStack `track()`, see updated Prompt 3.**
4. **No Consent Mode v2 / CMP.** Legally required (denied-by-default) in Spain; Google rejects EEA remarketing without it since March 2024. *(high)*
5. **Privacy/Terms footer links 404.** Google Ads destination-policy disapproval risk + GDPR exposure on PII-collecting forms. **Do not start paid traffic while these 404.** *(high)*
6. **Enter/mobile-Go submits step 1 directly**, bypassing all qualification; server errors render inside the *collapsed* step-2 container — an invisible, silently dead form. *(high)*
7. **Stranded work:** build-time ES rendering exists as *uncommitted* changes in worktree `.claude/worktrees/friendly-babbage-770ce6` (`build.mjs`, +98 lines, verified working per session notes) but was never committed. TDT currently serves English HTML translated at runtime — bad for LCP, Spanish paid clicks, and social scrapers.

**Real numbers allowed in copy** (Dmitry-confirmed): 7 locations · 78% retention · Valencia case study (4 venues / 16 events/mo) · 48h reply · 2 weeks to first event. Never invent stats ("12 active partners" was removed — don't reintroduce).

---

## Part 2 — Measurement architecture (build once, both networks feed from it)

**2026-07-05: Prompts 2 + 3 below shipped** (markers, `shared/consent.js`, `sendToRudderstack` in `netlify/lib/forms.ts`, the 3 functions, `qed.js` capture — `npm run typecheck` clean, verified end-to-end in `netlify dev`: consent banner renders/persists/translates, Accept triggers the CDN script load attempt, Decline never does, and a real form submission carries `_event_id`/`_consent`/`_fbc`/`_url` to the function). One implementation detail changed from the original prompt text below: the CDN script URL turned out to be a third required input, not something safe to hardcode — see the new `RUDDERSTACK_CDN_URL` var. **Still blocked on real values for `RUDDERSTACK_DATA_PLANE_URL` and `RUDDERSTACK_CDN_URL`** before this does anything on a real deploy — see Part 5.

**2026-07-04 decision: RudderStack replaces the hand-rolled GTM container + direct Meta Graph API calls.** RudderStack is the single client-side tag *and* the fan-out layer to ad platforms (configured via cloud-mode destinations in the RudderStack dashboard, not in our code). Two sources exist already:

| Env | Write key |
|---|---|
| Live (production) | `2e8anllkdUDI2MoK38sqseYAdMC` |
| QA (previews/branch deploys) | `3CDsy9jQEW5IMiEEJ6DzYSeBvFP` |

```
Browser                                  Netlify function                    RudderStack                       Ad platforms
───────                                  ────────────────                    ───────────                       ────────────
Consent Mode v2 default:denied
RudderStack JS SDK (write key selected
by Netlify deploy CONTEXT: production
→ live key, else → QA key)
  ├─ track('lead_intent')  ───────────────────────────────────────────────►  RudderStack source  ─────────►  Cloud-mode destinations
  │    (lead_type, persona, brand,                                            (live or QA, per write key)      (configured in dashboard,
  │     lang, utm_*/gclid/fbclid)                                                                               not in code):
  └─ track('lead_complete')                server-side track()                                                  · Facebook Conversions API
       event_id shared with the    ───────►  (same event_id, from                                               · Google Ads / Enhanced Conv.
       server-side call for dedup           netlify/lib/forms.ts,                                                · GA4
                                             em/ph hashed if the                                                 · (add more later — config only)
                                             destination doesn't hash
                                             automatically)

qed.js: UTM/gclid/fbclid → localStorage → merged into track() properties AND the Telegram "📣 Source:" line
```

Decisions (so nobody re-litigates them):
- **No GTM, no sGTM.** RudderStack's JS SDK is the only client-side tag; ad-platform pixels/tags are cloud-mode destinations RudderStack calls server-to-server, not scripts we load. Simpler CSP, no GTM container to maintain, no separate consent wiring per downstream tag.
- **No direct Meta Graph API calls from `forms.ts`.** `fireMetaCapi` is replaced by a generic `sendToRudderstack(event, properties, anonymousId)` that POSTs to the RudderStack HTTP API (`<dataPlaneUrl>/v1/track`) using the server-side write key. RudderStack's Facebook Conversions API destination (configured once in the dashboard with the Meta Pixel ID + CAPI token — those credentials live in RudderStack now, not our env vars) does the event-name mapping, dedup, and (check its settings) PII hashing. If that destination does **not** hash em/ph itself, `forms.ts` keeps doing it before sending — mirroring the existing `sha256` helper.
- **Event/property contract stays the same as the dataLayer plan:** `lead_intent` / `lead_complete`, carrying `lead_type`, `persona`, `brand`, `lang`, `event_id`, and (once Prompt 4 lands) `_utm_*`/`_gclid`/`_fbc` — client and server track calls share the same `event_id` so the Facebook Conversions API destination can dedup against a browser-side Pixel if one is later enabled.
- **fbp/fbc caveat:** without a browser-loaded Meta Pixel, there's no real `_fbp` cookie (only Meta's own pixel script sets it). `_fbc` can still be constructed from a `fbclid` URL param (no pixel needed) — see Prompt 4. This means slightly lower Meta EMQ than a full pixel+CAPI setup unless we also turn on RudderStack's device-mode Facebook Pixel destination later; cloud-mode-only is the simpler starting point.
- **Google Ads:** enhanced conversions + click-ID import happen via RudderStack's Google Ads destination, fed the same `lead_complete` event + hashed email/phone + `gclid`. GA4 stays a secondary destination for funnel analysis (`lead_intent` → `lead_complete` rate).
- **Three conversion actions with relative values:** `Lead — franchise` (value 10), `Lead — venue` (value 3), `Lead — events` (value 1). Swap in real values when pricing lands. Set these up as destination-side event mappings in RudderStack, not in our code.
- **Attribution to the CRM:** Telegram is still the CRM. The `📣 Source:` line per lead is the lead-quality feedback loop — founders judge campaign quality from it weekly. RudderStack is additive, not a replacement for that line.
- **Write-key handling:** keys are client-visible by design (they ship in the page's JS, same as any Segment/RudderStack snippet) — fine to bake into `window.QED_CONFIG`. Still source them from Netlify env vars (`RUDDERSTACK_WRITE_KEY`, `RUDDERSTACK_WRITE_KEY_QA`) rather than hardcoding in `build.mjs`, selected by Netlify's own `CONTEXT` var (`production` → live, anything else → QA) — mirrors the existing `BRAND`/`config.js` pattern.
- **Open question — data plane URL and CDN URL:** the JS SDK and the server-side HTTP call both need the RudderStack **data plane URL**, and the JS SDK also needs the exact **CDN script URL** for this workspace (the plausible-looking `cdn.rudderlabs.com/v3/...` path returned 403 when checked directly — RudderStack's CDN layout isn't something to guess at, it has to come from the source's own Setup page). Both now read from env vars (`RUDDERSTACK_DATA_PLANE_URL`, `RUDDERSTACK_CDN_URL`) so the code doesn't need to change once Dmitry supplies them — see Part 5.

## Part 3 — Campaign strategy

### Google Ads (Search) — capture intent. ~40% of budget.

| Campaign | Language | Keywords (exact/phrase) | Landing |
|---|---|---|---|
| Franchise ES | ES | franquicia de ocio, franquicia eventos, montar negocio ocio nocturno, franquicia rentable pequeña | /partners/ (TDT) |
| Franchise EN | EN | quiz night franchise, pub quiz business, events franchise spain | /partners/ (QED) |
| Venues ES | ES | animación para bares, cómo llenar mi bar entre semana, eventos para bares, quiz para bares | /venues/ |
| Corporate | ES+EN | team building valencia/madrid/murcia, cena de empresa original, actividades team building | /corporate/ |
| Celebrations | ES | despedida de soltera original valencia, cumpleaños diferente valencia, juegos despedida soltera | /celebrations/ |
| Brand | both | qed quiz, quiz eat drink, tardeo de trivia | / (hub) |

Negatives: gratis/free, online, app, trabajo/empleo (franchise attracts job seekers), TV. Location: launch cities + 25km. **Seasonal note:** celebrations (despedidas) peaks NOW (Jul); corporate "cena de empresa" ramps from September — pages need those hooks (prompts 10–11).

### Meta Ads — generate demand + retargeting. ~60% of budget.

- **C1 Venues (Lead objective, landing page):** target bar/restaurant owners — interests (hospitality, TPV/hostelería tools) + geo. Creative: the dead-Tuesday → full-room story; "0% commission, no contracts" is the hook. Optimize on `Lead` filtered `lead_type=venue`.
- **C2 Franchise (Lead objective):** broad + interest (emprendimiento, franquicias) in target cities. Creative: "Run trivia nights. Build a real business." + the 7 locations / 2-weeks-to-launch stat. Expect lower volume, higher value — the value-based conversion setup handles bidding.
- **C3 Private events:** corporate (job-title/interest targeting weekdays) + celebrations (engaged-shortly, birthday-soon audiences; despedida creative Jul–Sep).
- **C4 Retargeting:** website visitors 30/180d who fired `lead_intent` but not `lead_complete` — the two-step form gives you this segment for free. Cross-sell venue↔franchise audiences.
- **Custom audiences from leads:** export Telegram leads monthly (hashed email) → seed lookalikes per persona once >100 leads each.

UTM taxonomy (bake into every ad): `utm_source=meta|google · utm_medium=paid_social|cpc · utm_campaign={city}_{persona}_{objective}_{YYYYMM} · utm_content={creative}`.

### KPIs & feedback loop

| Metric | Target | Where |
|---|---|---|
| CPL franchise | < €25 qualified | Ads + Telegram source line |
| CPL venue | < €12 | " |
| CPL events | < €8 | " |
| Meta EMQ | > 6.0 | Events Manager |
| lead_intent → lead_complete | > 55% | GA4 funnel |
| Consent opt-in rate | > 65% | RudderStack consent gate |
| Weekly ritual | Founders tag each Telegram lead ✅/❌ qualified, per source | 15 min/wk |

Launch sequence: **Week 0** ship Batch 0 prompts → QA with Meta `test_event_code` + GTM preview + Google Tag Assistant → **Week 1** launch Search brand + venues ES + Meta C1 at €20/day → **Week 2** add franchise + retargeting once EMQ confirmed > 6 → **Week 3+** scale what the Telegram quality tags support.

---

## Part 4 — Sonnet prompts

Paste the CONTEXT block first, then one prompt per session. Batches are ordered by launch-criticality; prompts within a batch are independent.

### CONTEXT block (prepend to every prompt)

```
Repo: /Users/dmitry/qed-landing — static landing site (5 pages: index.html hub,
corporate/, celebrations/, venues/, partners/) + Netlify functions
(netlify/functions/{book-event,franchise-apply,venue-apply}.ts, shared lib
netlify/lib/forms.ts) + build.mjs (per-brand build: BRAND=QED→quizeatdrink.com/EN,
BRAND=TDT→tardeodetrivia.com/ES; injects SEO tags at the <!-- build:seo --> marker,
but ONLY inside its `if (brand)` branch). Shared assets in shared/ (qed.js, qed.css,
i18n*.js). IGNORE .claude/worktrees/ entirely. Site is LIVE.

Hard rules:
- i18n: English is baked into the HTML; the shared/i18n-*.js dicts are ES-ONLY
  (there is no EN dict). Any visible copy change = edit the baked EN in HTML AND
  the matching ES key. The i18n engine (shared/i18n.js) swaps textContent of LEAF
  nodes carrying data-i18n — mixed-content elements need an inner <span data-i18n>;
  never append siblings (like a required-asterisk span) INSIDE an element whose
  textContent gets replaced.
- Forms are novalidate and the submit handler in shared/qed.js does NO validation —
  adding `required` to a step-2 field does nothing unless the submit handler is
  also taught to check it.
- Real numbers only: 7 locations, 78% retention, Valencia case (4 venues /
  16 events/mo), 48h reply, 2 weeks to first event. NEVER invent stats, quotes,
  or testimonials.
- Design is deliberately non-uniform ("handmade over systematic", PRODUCT.md):
  keep the scorecard motif, varied layouts, tag/stamp styling. No uniform card grids.
- Netlify function headers are lowercase (event.headers['user-agent'],
  ['x-nf-client-connection-ip']). forms.ts clean() passes any string field through,
  so new client payload fields need no server whitelist change.
- After changes: `npm run typecheck` must pass; verify pages render with
  `netlify dev` if you change qed.js or build.mjs.
```

---

### BATCH 0 — Launch blockers (ship all before spending €1)

**Prompt 1 — Privacy & Terms pages (unblocks Google Ads approval)**

```
The shared footer on all 5 pages links to /privacy/ and /terms/ (e.g.
partners/index.html:361-362) but neither page exists — they 404 on the live site.
The forms collect name/email/phone, so this is a Google Ads destination-policy
disapproval risk and a GDPR problem in Spain.

Create privacy/index.html and terms/index.html reusing the existing page shell
(head pattern with <!-- build:seo --> marker, shared/qed.css, nav, footer — copy
the structure from venues/index.html, strip the form/sections). Content: a clean,
honest GDPR-compliant privacy policy for a Spanish company (data controller: QED;
data collected: name, email, phone, form contents; purpose: responding to
enquiries; processor: Telegram for internal lead handling, Netlify hosting;
rights: access/rectification/erasure via hello@qed.es; retention: 24 months) and
minimal terms of service. Write EN baked into the HTML with data-i18n keys, and
add new shared/i18n-privacy.js + i18n-terms.js ES dicts following the existing
dict pattern (see shared/i18n-venues.js structure and how pages load their dict).
Add "privacy/" and "terms/" to the PAGES array in build.mjs so they get SEO tags.
Also add a one-line privacy notice with link under each of the 4 form submit
buttons ("We only use this to reply to you — privacy policy") — EN baked + ES key
in each page's dict. Mark both pages noindex.

I am not a lawyer — keep the policy factual and conservative, and add an HTML
comment at the top flagging it for legal review.
```

**Prompt 2 — RudderStack SDK + Consent Mode v2 via build injection**

```
No client-side measurement exists on any page (verified: zero
gtag/googletagmanager/fbq/rudderanalytics matches repo-wide). qed.js pushes
lead_intent/lead_complete into a dataLayer nothing consumes. We've decided to
use RudderStack (not GTM) as the single client-side tag + fan-out layer to
Meta/Google — two sources already exist:
  live write key: 2e8anllkdUDI2MoK38sqseYAdMC
  QA write key:   3CDsy9jQEW5IMiEEJ6DzYSeBvFP
Both need the RudderStack DATA PLANE URL too (ask Dmitry if not already in
Netlify env vars as RUDDERSTACK_DATA_PLANE_URL — the write key alone doesn't
tell the SDK where to send events).
Gate everything behind Consent Mode v2 (denied-by-default — Spain/AEPD).

Implementation (mirror the existing build:seo / config.js pattern in build.mjs):
1. Add an inert <!-- build:analytics --> marker right after <meta name="viewport">
   in all 5 heads (7 if privacy/terms exist by now), and
   <!-- build:analytics-body --> right after each <body> tag (keep the body
   marker even if unused yet — RudderStack device-mode destinations may need
   noscript/init markup later).
2. Extend the config object build.mjs writes to config.js: add
   rudderstackWriteKey (RUDDERSTACK_WRITE_KEY when process.env.CONTEXT ===
   'production', else RUDDERSTACK_WRITE_KEY_QA — both env vars, never hardcode
   the keys in build.mjs) and rudderstackDataPlaneUrl (RUDDERSTACK_DATA_PLANE_URL).
   Unbranded/local builds still get whichever env vars are set locally (falls
   back to undefined → SDK simply doesn't load, same inert-preview behavior as
   build:seo today).
3. Replace the <!-- build:analytics --> marker with the RudderStack JS SDK
   snippet (standard rudder-analytics.js loader), initialized with
   window.QED_CONFIG.rudderstackWriteKey + dataPlaneUrl, but DON'T call
   rudderanalytics.load()/page() until consent is granted — queue an
   initializer function that the consent banner calls on Accept, and call it
   immediately if the stored consent is already 'granted' from a prior visit.
4. Consent banner: lightweight, handmade-styled (tag/stamp aesthetic per
   PRODUCT.md, NOT a cookie-wall) fixed to bottom, two equal buttons
   Accept / Reject, persisting to localStorage ('qed-consent'). Only render
   the banner when window.QED_CONFIG has a rudderstackWriteKey. Banner copy:
   EN baked in a new shared consent.js that injects it + ES keys in
   shared/i18n-common.js. Respect prefers-reduced-motion.
5. In qed.js, add data._consent = (localStorage 'qed-consent' value or
   'denied') to the form POST payload, and in netlify/lib/forms.ts make the
   new sendToRudderstack() (see Prompt 3) return early unless
   _consent === 'granted'.
6. Wire trackLeadIntent/trackLeadComplete (shared/qed.js) to also call
   window.rudderanalytics.track(name, detail) when rudderanalytics is loaded
   (keep the existing dataLayer.push as-is — cheap, harmless, useful for
   future GA4-via-RudderStack debugging in the browser console).

Do not configure Meta/Google destinations in code — that happens once inside
the RudderStack dashboard (cloud-mode connections), not in this repo. The
deliverable here is: markers, build injection of the two RudderStack env
vars, consent default + banner, consent-gated SDK load, and track() calls
routed through RudderStack.
```

**Prompt 3 — Server-side RudderStack forwarding (replaces direct Meta CAPI calls)**

```
netlify/lib/forms.ts's fireMetaCapi() calls the Facebook Graph API directly.
We've decided to route server-side events through RudderStack instead (its
Facebook Conversions API + Google Ads destinations are configured once in the
RudderStack dashboard with the real Meta Pixel ID/token and Google Ads IDs —
this repo no longer needs META_PIXEL_ID/META_CAPI_TOKEN). Replace
fireMetaCapi with a generic sendToRudderstack() and fix the three delivery
bugs it inherits:

A) New function shape: sendToRudderstack(event: string, d: Dict, page: string)
   in forms.ts. Reads RUDDERSTACK_WRITE_KEY (or RUDDERSTACK_WRITE_KEY_QA when
   process.env.CONTEXT !== 'production') and RUDDERSTACK_DATA_PLANE_URL from
   env; no-ops if either is unset (same fail-open behavior fireMetaCapi had
   for missing Meta env vars). Returns early unless d._consent === 'granted'
   (see Prompt 2 step 5).

B) Client fields never sent yet: shared/qed.js's submit handler (lines
   ~100-104) sends only FormData + lang + country. Before the fetch, add:
   data._event_id = crypto.randomUUID ? crypto.randomUUID() :
   Date.now() + '-' + Math.random().toString(16).slice(2), and
   data._url = location.href. Pass the same _event_id into the
   trackLeadComplete(...) push (Prompt 2 step 6) so the client-side
   RudderStack track() and the server-side one share one event/message ID —
   set it as the RudderStack message's messageId (or a top-level
   properties.event_id if the SDK doesn't expose messageId easily) so the
   Facebook Conversions API destination's dedup can match a future
   device-mode Pixel event. Also capture fbclid-derived _fbc the same way the
   original plan described (readCookie('_fbc') ||, from stored attribution's
   fbclid, 'fb.1.' + Date.now() + '.' + fbclid) — RudderStack's Facebook
   destination uses it for click-based matching even with no Pixel loaded.

C) Build the payload: in each of the three functions (book-event,
   franchise-apply, venue-apply), stash d._ua = event.headers['user-agent']
   and d._ip = event.headers['x-nf-client-connection-ip'] before calling
   sendToRudderstack (same as the old fireMetaCapi signature — no changes to
   call sites beyond the rename). Inside sendToRudderstack, build a RudderStack
   HTTP API v1/track payload: { event, userId or anonymousId (generate one if
   absent — a stable per-lead id, e.g. sha256 of email, is fine), properties:
   { lead_type, page, ...whatever's useful }, context: { ip: d._ip,
   userAgent: d._ua }, traits (or context.traits): { email, phone, firstName,
   lastName } }. CHECK RudderStack's Facebook Conversions API destination
   docs for whether it hashes em/ph/fn/ln itself — if not, SHA-256
   lowercase-trimmed hash them here first (reuse the existing sha256 helper),
   mirroring what fireMetaCapi used to do by hand.

D) Delivery must be awaited, not fire-and-forget: sendToRudderstack is async,
   returns the fetch promise with AbortSignal.timeout(2000), logs non-2xx
   like sendTelegram does, and in all three handlers runs in parallel with
   sendTelegram via Promise.allSettled so no latency is added but delivery is
   awaited (same fix the old Prompt 3 called for — the bug is unchanged,
   only the destination is).

Delete fireMetaCapi and the direct graph.facebook.com fetch entirely — no
code in this repo should call the Facebook Graph API directly anymore.
npm run typecheck must pass.
```

**Prompt 4 — Attribution capture: UTM/gclid/fbclid → payload → Telegram**

```
Leads land in Telegram (the de-facto CRM) with zero campaign attribution — the
payload is form fields + lang + country, and forms.ts metaLine() renders only
'Lang | Country | Page'. With Meta + Google launching we need per-campaign lead
quality visibility.

1. In shared/qed.js (top of the IIFE): on every page load parse location.search
   for utm_source/utm_medium/utm_campaign/utm_term/utm_content/gclid/fbclid;
   if any present, store first-touch JSON + a timestamp into localStorage key
   'qed-attr' (try/catch like shared/i18n.js does; do NOT overwrite an existing
   entry younger than 30 days — first touch wins). Also store
   document.referrer's hostname on first touch when no params exist.
2. In the submit handler, merge the stored attribution into the POST body as
   _utm_source, _utm_medium, _utm_campaign, _utm_term, _utm_content, _gclid,
   _fbclid, _ref.
3. In netlify/lib/forms.ts extend metaLine() with a second line when any source
   data is present: '📣 {utm_source||ref||"direct"} / {utm_medium||"—"} /
   {utm_campaign||"—"}' plus ' · gclid' / ' · fbclid' presence flags. All three
   functions use metaLine already, so one change covers them.
4. Also merge _utm_source/_utm_medium/_utm_campaign/_utm_term/_utm_content/
   _gclid/_fbclid into the properties object of both the client-side
   trackLeadIntent/trackLeadComplete RudderStack track() calls (Prompt 2) and
   the server-side sendToRudderstack() call (Prompt 3) — RudderStack's Google
   Ads and Facebook destinations use gclid/fbclid for click-based matching,
   so this data needs to reach RudderStack, not just Telegram.

No visible copy, no i18n changes. typecheck must pass.
```

**Prompt 5 — dataLayer enrichment + bot/error hygiene**

```
The dataLayer events in shared/qed.js are too thin to segment campaigns on, and
two hygiene gaps will poison conversion data once tags go live:

1. Enrich pushes: trackLeadComplete currently sends {form} only (line ~123),
   trackLeadIntent {form, eventType} (line ~87). Both should also carry:
   lead_type ({corporate:'event', celebrations:'event', venues:'venue',
   partners:'franchise'})[window.QED_SITE] || 'event'), persona:
   window.QED_SITE, brand: (window.QED_CONFIG||{}).brand || 'DEV',
   lang: document lang, and (lead_complete only) event_id: data._event_id
   (exists if the CAPI prompt landed; guard with if).
2. Error visibility: the submit catch branch pushes nothing — add
   track('lead_error', {form, message: err.message}) there.
3. Honeypot conversions: the server fakes success on honeypot submissions
   (book-event.ts:17 etc.), so JS-executing bots fire trackLeadComplete and
   will become Meta/Google 'conversions'. In the qed.js submit handler, before
   the fetch: if (form.elements._honey && form.elements._honey.value)
   { form.classList.add('sent'); return; } — mimic success, skip network +
   tracking. Server stays unchanged.

No visible copy changes → no i18n work.
```

**Prompt 6 — Recover the stranded build-time ES rendering**

```
The worktree .claude/worktrees/friendly-babbage-770ce6 contains UNCOMMITTED
changes to build.mjs (+98 lines): build-time Spanish rendering — on BRAND=TDT
builds it renders the ES dictionaries into the HTML (leaf data-i18n text +
placeholder/aria-label/content attrs, mirroring i18n.js apply(); dicts loaded
via import() with a window shim, HTML-escaped output). It was verified working
(565/565 strings across 5 pages) but never committed.

Run: git -C /Users/dmitry/qed-landing/.claude/worktrees/friendly-babbage-770ce6
diff -- build.mjs   — review the diff, apply it to the main checkout's
build.mjs, and verify: (1) BRAND=TDT node build.mjs renders Spanish text into
the pages (spot-check a few v.*/p.* strings in venues/partners HTML output),
(2) BRAND=QED and unbranded builds leave HTML untouched, (3) restore the
pages + config.js afterwards (git checkout -- the modified HTML/config.js;
build output must not be committed). Commit ONLY build.mjs. If new pages
privacy/ + terms/ exist, extend the rendering to cover their dicts too.

Why this matters now: TDT (Spanish brand) currently ships English HTML that
translates at runtime — Spanish paid clicks see an English flash (or English
og previews in scrapers), and LCP pays for the runtime pass.
```

---

### BATCH 1 — Form integrity & lead quality (ship before or with first campaigns)

**Prompt 7 — Fix the Enter-key bypass and invisible errors**

```
Three connected defects make the two-step lead forms silently lose paid clicks
(all 4 forms: corporate, celebrations, venues, partners):

1. Enter / mobile-keyboard-Go in a step-1 field triggers implicit form
   submission (the only type=submit lives inside the collapsed step-2
   container), skipping Continue validation, step 2, and lead_intent. In the
   qed.js submit handler, first thing: if (step2 &&
   !form.classList.contains('at-step2')) { if (continueBtn)
   continueBtn.click(); return; } — Enter then advances to step 2 instead.
2. The submit handler performs zero validation before fetch. Add a
   whole-form required-field check mirroring the Continue handler's loop
   (checkValidity + reportValidity on first invalid), so step-2 required
   fields actually enforce (forms are novalidate — this handler is the only
   enforcement point).
3. Server 400s render invisibly: the .form-error element sits INSIDE
   .form-step2__in, which is clipped (grid-template-rows:0fr +
   overflow:hidden) until step 2 opens. Move the .form-error <p> out of the
   step-2 container to directly after .form-body in all four pages so errors
   are always visible.

Also map server errors to localized copy: the functions return raw English
strings ('Missing required field: firstName') which qed.js renders verbatim —
on the Spanish-first TDT brand. Change the three functions to also return a
stable code ({ok:false, code:'missing_field'|'invalid_email'|'send_failed',
error:...}); in qed.js map known codes to localized strings (EN fallback
hardcoded in JS + new ES keys form.err.missing/form.err.email in
shared/i18n-common.js — note there is no EN dict) and use the existing
form.generr for unknown codes. Never render res.body.error raw.
```

**Prompt 8 — Lead qualification fields (all four forms)**

```
Tune the four lead forms so paid leads arrive scoreable in Telegram. All new
fields are step-2 and OPTIONAL unless stated (never add step-1 friction); every
new visible string = baked EN in HTML + ES key in that page's shared/i18n-*.js
dict. The submit handler enforces required only if the whole-form validation
fix landed (check shared/qed.js; if absent, add required-field checking to the
submit handler as part of this task). Extend the matching Netlify function's
Telegram lines for every new field.

venues/index.html + venue-apply.ts:
- Add optional tel input 'Phone / WhatsApp' (name=phone, autocomplete=tel) —
  bar owners live on WhatsApp, email-only follow-up kills speed-to-lead.
- Make city required (+ .req asterisk following the step-1 label pattern —
  asterisk as sibling span, NOT inside the data-i18n element).
- Add optional number input 'Approx. capacity (seats)' (name=capacity, min=1).
- Telegram: add 📱 Phone and 🪑 Capacity lines.

partners/index.html + franchise-apply.ts:
- The #p-venues select pre-selects the STRONGEST answer ('I already have venue
  relationships') because it has no placeholder — every skipped field inflates
  lead quality. Add a disabled selected empty-value placeholder option
  ('— pick one —') and make the select required.
- Add optional select 'When would you want to launch?' (name=timeline):
  Now / 1-3 months / Later this year / Just exploring. Telegram: 🗓 Timeline.

corporate/index.html + book-event.ts:
- Add optional text input 'Company' (name=company, autocomplete=organization) —
  the ES dict already has an orphan key c.form.company ("Empresa"), reuse it.
- Add 4th eventType option 'Company party / something else' (new c.form.et4
  ES key) — 'cena de empresa' seekers currently have no fitting option on a
  required field.
- Telegram: 🏢 Company line.

corporate + celebrations (both use book-event.ts):
- City selects pre-select Valencia with no placeholder → geo campaigns in
  Madrid/Murcia misattribute skipped fields. Add <option value=""
  data-i18n="form.cityph">Choose a city…</option> first (key in
  shared/i18n-common.js, where form.city lives).
- Make groupSize required on both pages (CAUTION: their labels carry data-i18n
  directly on the <label> — restructure to inner-span pattern before adding
  the asterisk sibling, or i18n.js will destroy it).

celebrations/index.html:
- Add eventType option 'Hen & stag party' / ES 'Despedida de soltera/o' BEFORE
  'Something else' (options have no value attributes — the submitted value is
  the rendered label, which is fine).
```

**Prompt 9 — Lead reliability & anti-spam**

```
Two robustness gaps in the lead pipeline (netlify/lib/forms.ts + the three
functions), important once paid traffic multiplies volume:

1. Lost leads: when sendTelegram fails (Telegram outage or its ~20 msg/min
   group rate limit — reachable during an ad-driven burst), the handler returns
   500 and the lead evaporates — it isn't even logged. In each handler when
   sending fails: console.log(JSON.stringify({lostLead: d, page})) so it's
   recoverable from Netlify function logs, and add one retry with ~1s backoff
   in sendTelegram for 429/5xx responses. (Skip Netlify Blobs for now — logs
   are enough at current volume.)
2. Time-gate against form bots (paid Meta traffic attracts JS-executing bots
   that skip honeypots): in shared/qed.js set data._t = a timestamp captured at
   page init into the payload; in each function, silently fake success
   (return json(200,{ok:true}) without Telegram/CAPI) when Date.now() - _t <
   3000ms or _t is missing/unparseable — mirroring the existing honeypot
   behavior at the top of each handler. Invisible to humans.

typecheck must pass; no visible copy changes.
```

---

### BATCH 2 — Message match & conversion copy (biggest ad-relevance wins)

**Prompt 10 — Venues page: proof, ordering, believability**

```
Three verified fixes on venues/index.html (+ shared/i18n-venues.js for ES):

1. Zero proof numbers on the page: the strongest allowed evidence lives only on
   the partners page. Add a compact case strip to the #calc 'Why it works'
   section: eyebrow 'Running now in Valencia', stats '4 venues · 16 quiz nights
   a month' and '78% of players come back month on month' framed in
   venue-owner language ("that's your regulars stat"). Reuse the dark
   stat-panel pattern from partners/index.html (~lines 227-236, inline-styled
   so it ports cleanly). ONLY these numbers — they are the confirmed-real set.
   New v.case.* ES keys.
2. The 'Coming soon' Express card renders BEFORE the sellable Classic card
   ('Available now') in the #plans grid — on mobile a paid click meets an
   unavailable product and a dead button first. Swap the two .fmt card blocks
   (pure DOM reorder; CSS hangs off .fmt--soon, verified :nth-child-safe).
3. 'Four rounds, 40 questions each' (line ~124; ES v.plan.clasf1) reads as a
   160-question marathon. CONFIRM THE REAL FORMAT WITH DMITRY FIRST (leave a
   TODO comment if unconfirmed); if it's 40 total, change to 'Four rounds,
   40 questions' / 'Cuatro rondas, 40 preguntas en total'.
```

**Prompt 11 — Partners page: franquicia head term, FAQ, i18n gaps**

```
Verified fixes on partners/index.html (+ shared/i18n-partners.js, index.html,
shared/i18n-hub.js):

1. The head term franchise-seekers actually search — 'franquicia' — is absent
   from the title and nav. Retitle: EN <title> 'QED Franchise · Run trivia
   nights. Build a real business.' + og:title to match (baked EN only — og has
   no data-i18n-content here); ES p.title 'Franquicia QED · Monta noches de
   quiz. Crea un negocio de verdad.'. Change the hub nav label (index.html
   nav + h.nav.partners in i18n-hub.js) from 'Partners'/'Socios' to
   'Franchise'/'Franquicia' — matching the hub #work card kicker that already
   says Franchise.
2. No FAQ: the highest-consideration page has no objection handling. Add a
   4-6 item FAQ between the case study and #apply reusing the details/summary
   FAQ markup from corporate/index.html (~242-273; .faq styles are in the
   shared CSS already). Questions: 'Do I need hosting experience?', 'How much
   time per week?', 'What does it cost to start?' (conceptual — no invented
   numbers), 'Am I locked in?', 'What if my first night is quiet?'. DRAFT
   answers from what the page already claims (platform/content/training/48h
   SLA/2-weeks) and mark each answer with an HTML comment
   <!-- CONFIRM WITH DMITRY --> — do not invent facts. EN baked + p.faq.* ES keys.
3. Hero scorecard strings ('Friday · full house', 'Players in', 'Tables
   booked', 'Regulars returning', 'most of them') and the stamp's 'reply' are
   hardcoded English — visible untranslated on the Spanish TDT brand (desktop).
   Add data-i18n keys + ES values. CAUTION: the scorecard header is mixed
   content ('Friday · full house <span>R4</span>') — wrap the text in its own
   <span data-i18n> (the apply-section scorecard shows the pattern); same for
   the stamp inner span. Do the same for the hub hero scorecard header
   'Thursday · Round 5 <span>Final</span>' (index.html:~60, h.hero.* keys).
```

**Prompt 12 — Occasion & routing gaps (hub, celebrations, corporate, cross-links)**

```
Verified message-match and routing fixes across pages (every string: baked EN
in HTML + ES key in that page's dict):

1. Hub business router: the hero's two CTAs are both consumer-facing and the
   franchise/venues doors are the LAST section — a venue owner or franchise
   prospect from brand search sees no business path above the fold. Add a
   quiet one-line router under the hero CTA row: mono-eyebrow style 'Here on
   business?' + inline links 'for your company · for a party · for your bar ·
   franchise' → /corporate/, /celebrations/, /venues/, /partners/. Style as a
   handmade tag/stamp row (PRODUCT.md forbids uniform card grids). h.hero.*
   ES keys.
2. Despedidas: 'despedida de soltera/o' is a top Spanish party query (peak
   season now) and the celebrations page never says the word — hero tag reads
   'Birthdays · Weddings · Anniversaries' and the only mention is a buried FAQ
   aside. Add it to the hero tag ('Birthdays · Weddings · Despedidas' EN:
   'Birthdays · Hen & stag · Anniversaries' — pick the natural phrasing per
   language), to the metadesc (EN + cel.metadesc), and extend FAQ a4 to name
   despedidas explicitly.
3. Cena de empresa: corporate vocabulary is offsites/client nights/team days —
   no hook for the Sep-Dec 'cena de empresa'/Christmas-party spike. Add
   'Christmas & end-of-year parties' / 'cenas de empresa y fiestas de fin de
   año' to the occasions copy and metadesc.
4. Cross-links: persona pages link each other only via the footer. Add one
   in-body cross-sell line near each form: venues → 'Want to run the nights,
   not just host them? See the franchise' (/partners/); partners → 'Own a bar
   and just want the crowd? Host a night instead' (/venues/); corporate ↔
   celebrations for misrouted personal/company occasions.
5. Geo titles: append the city to the hub + corporate + celebrations <title>
   tags only (H1s untouched): e.g. corporate → 'Team building in Valencia,
   Madrid & Murcia people actually enjoy · QED'; hub → '…pub quiz nights in
   Valencia & across Spain'. Update baked EN titles + h.title/c.title/cel.title
   ES keys. venues/partners stay nationwide.
```

---

### BATCH 3 — Speed & polish (quality-score and CVR compounding)

**Prompt 13 — Rendering path: LCP, fonts, config.js**

```
Performance fixes for paid-traffic landing (mobile-first), all verified against
the current code:

1. Above-the-fold content ships opacity:0: hero elements carry .reveal and only
   become visible after four synchronous end-of-body scripts run — JS delays
   LCP and a JS failure hides the hero. Make above-the-fold instant: don't
   apply the hidden initial state to .reveal elements inside the hero — e.g.
   scope the pre-reveal opacity:0 to .reveal outside .hero, or add a .reveal
   --instant variant used in heroes on all 5 pages, letting qed.js's observer
   skip already-visible nodes. ALSO add a no-JS failsafe: a <noscript> or
   html.js-gated rule so .reveal is visible when scripts never run (check the
   existing js-class one-liner in the head). Preserve the scroll-reveal feel
   for below-fold sections and prefers-reduced-motion behavior.
2. Google Fonts CSS is render-blocking and the 900-weight display headline
   reflows on swap: add preconnect to fonts.gstatic.com (crossorigin) +
   fonts.googleapis.com, and load the fonts stylesheet with the
   media="print" onload="this.media='all'" pattern plus a <noscript> fallback
   link. Audit the requested families/weights and drop any weight not used by
   qed.css.
3. /config.js is a synchronous head request for a 2-line file: in build.mjs's
   branded branch (it already rewrites each page), replace the
   <script src="/config.js"></script> tag with an inline
   <script>window.QED_CONFIG={...}</script>. Unbranded/local builds keep the
   external file (i18n.js reads it at execution — do not defer).
4. netlify.toml cache headers target paths that don't exist (/*.jsx, /assets/*).
   Replace with: /shared/* → public, max-age=604800 (assets are stable),
   and explicit no-cache for /config.js.

Verify with netlify dev + preview screenshots that the hero renders
immediately and nothing visually regresses on any of the 5 pages.
```

**Prompt 14 — CTA contrast + logo weight + language switcher**

```
Three small verified wins (shared/qed.css, shared/, build.mjs):

1. AA contrast: the primary CTA fails WCAG AA on 3 of 5 landings — #E8631A on
   white = 3.37:1 and #D64545 = 4.38:1 at 16-17px/800 (below the large-text
   threshold, so 4.5:1 applies). Verified passing swaps within brand palette:
   #C84F0B (4.59:1) and #B83232 (5.93:1) — adjust the accent-deep token used
   by .btn--cta so hero CTAs on index/corporate/celebrations pass; venues
   green and partners btn--soft already pass. One-line-per-token CSS change;
   verify with the preview across all 5 pages + both themes.
2. Logo bytes: shared/qed-logo.png is a 1000×1000 55KB PNG rendered ~110px
   tall, and BOTH brand logos download on every page (the CSS-hidden one still
   fetches). Export a tightly-cropped wordmark at ~2x display size as
   optimized PNG/WebP (~10KB), update the .brand__en/.footer img references
   WITH width/height attributes, and update the crop math at qed.css:360-367
   (it's designed around the padded square). Keep the 1000px square for
   favicon/apple-touch-icon. On BRANDED builds only, have build.mjs strip the
   other brand's logo <img> (the unbranded build needs both for the live
   switcher).
3. Language switcher: i18n.js injectSwitcher() inserts .langsw into .nav__links
   after DOMContentLoaded (desktop nav shifts after paint) and its buttons are
   ~31px tall. Bake the .langsw markup statically into .nav__links on all 5
   pages (i18n.js already no-ops when one exists — but verify/extend its click
   binding to attach to pre-existing [data-lang] buttons, add role=group +
   aria-label), and raise padding to clear 44px effective tap height.
   Static 'EN'/'ES' labels need no dict keys.
```

---

## Part 5 — Questions only Dmitry can answer (blocking specific items)

1. **Territory policy** — is it one partner per city/area? If yes, it's both the missing #1 objection answer on /partners/ AND the honest scarcity lever for ad copy ("your city may already be taken"). *(blocks part of prompt 11)*
2. **Quiz format** — "Four rounds, 40 questions each" = 160 questions? Real number? *(blocks part of prompt 10)*
3. **Pricing anchors** — franchise setup fee / monthly / rev-share %, and private-event from-prices. The ledger slots and .fmt__price slots are structurally ready. Until then leads can't self-qualify on budget.
4. **RudderStack data plane URL + CDN script URL** — the write keys (live `2e8anllkdUDI2MoK38sqseYAdMC` / QA `3CDsy9jQEW5IMiEEJ6DzYSeBvFP`) were provided 2026-07-04. Code now ships (2026-07-05) reading both from Netlify env vars `RUDDERSTACK_DATA_PLANE_URL` and `RUDDERSTACK_CDN_URL` — grab the exact values from each source's own "Setup" page in the RudderStack dashboard (don't reuse a URL found by guessing; a plausible-looking CDN path checked out as a dead 403 during implementation). Until both are set in Netlify, the consent banner still renders but nothing actually loads or sends. *(was blocking Prompt 2/3 — code is unblocked, delivery isn't)*
5. **RudderStack destination status** — Dmitry confirmed 2026-07-04 the Facebook Conversions API / Google Ads destinations are already connected in the dashboard. Worth a smoke test once the data plane/CDN URLs are in Netlify: submit a real lead on a deploy preview and confirm it shows up in RudderStack's live event stream and, from there, in Meta Events Manager.
6. **Venue/night list** for the hub #play section (existing open item — also unlocks consumer remarketing later).

## Deliberately NOT recommended

- **GTM / hand-rolled direct Meta Graph API calls** — superseded 2026-07-04 by the RudderStack decision (see Part 2); RudderStack is now the single client-side tag and the only path server-side events take to ad platforms.
- **sGTM deployment** — Netlify functions (now forwarding through RudderStack) already give a server-side CAPI path; revisit at scale.
- **Regularizing layouts/scorecards** — deliberate per PRODUCT.md; verifiers rejected every finding that touched them.
- **Instant Forms (Meta) as primary** — landing-page leads are higher intent and feed the same measurement spine; test Instant Forms later for franchise volume only.
- **Partial-lead capture on step-1 Continue** — GDPR/consent copy overhead + brand risk; revisit if step-2 abandonment shows up in GA4 funnels.
- **CAPTCHA** — honeypot + time-gate + rate-awareness is enough; don't add friction to the conversion.
