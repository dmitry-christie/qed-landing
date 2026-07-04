# QED Paid Acquisition Plan — Franchise, Venues & Private Events

**Date:** 2026-07-04 · **Source:** 20-agent verified audit (62 confirmed findings, 2 refuted) across 7 dimensions of the 5 landing pages, forms, functions, and build system.
**Goal:** launch Meta Ads (with CAPI) + Google Ads Search selling the franchise to event organisers and venue owners, plus private events (corporate + celebrations).

---

## Part 1 — State of play (TL;DR)

**The pages are good. The plumbing is not.** Hero copy, message match, honest stats, and the two-step forms are launch-quality on all four persona pages. What blocks spending money today:

1. **Zero client-side measurement.** No GTM, GA4, or Meta Pixel on any page. `lead_intent`/`lead_complete` push into a dataLayer nothing reads. Google Ads would run completely blind. *(critical)*
2. **No lead attribution.** UTM/gclid/fbclid are never captured; Telegram (the de-facto CRM) shows identical messages for a €50-CPC lead and an organic one. Per-campaign lead quality is uncomputable. *(critical)*
3. **CAPI is half-built.** `fireMetaCapi` in `netlify/lib/forms.ts` already fires CompleteRegistration server-side, but the client never sends `_fbp/_fbc/_event_id/_url/_ua` — events go out with hashed email only (low EMQ, no dedup key), and the unawaited `void fetch` gets killed by Lambda freeze nondeterministically. *(high)*
4. **No Consent Mode v2 / CMP.** Legally required (denied-by-default) in Spain; Google rejects EEA remarketing without it since March 2024. *(high)*
5. **Privacy/Terms footer links 404.** Google Ads destination-policy disapproval risk + GDPR exposure on PII-collecting forms. **Do not start paid traffic while these 404.** *(high)*
6. **Enter/mobile-Go submits step 1 directly**, bypassing all qualification; server errors render inside the *collapsed* step-2 container — an invisible, silently dead form. *(high)*
7. **Stranded work:** build-time ES rendering exists as *uncommitted* changes in worktree `.claude/worktrees/friendly-babbage-770ce6` (`build.mjs`, +98 lines, verified working per session notes) but was never committed. TDT currently serves English HTML translated at runtime — bad for LCP, Spanish paid clicks, and social scrapers.

**Real numbers allowed in copy** (Dmitry-confirmed): 7 locations · 78% retention · Valencia case study (4 venues / 16 events/mo) · 48h reply · 2 weeks to first event. Never invent stats ("12 active partners" was removed — don't reintroduce).

---

## Part 2 — Measurement architecture (build once, both networks feed from it)

```
Browser                                Netlify function                 Ad platforms
───────                                ────────────────                 ────────────
Consent Mode v2 default:denied
GTM container (per-brand env var)
  ├─ GA4 config (analytics consent)
  ├─ Meta Pixel base + Lead on         fireMetaCapi → Meta CAPI  ─────► Meta Events Manager
  │    lead_complete (event_id ──────────── same event_id ─────────────► dedup, EMQ > 6
  │    from dataLayer)                  (em+ph+fn/ln+IP+UA+fbp/fbc)
  └─ Google Ads conversion tag
       on lead_complete, per lead_type,
       + enhanced conversions (email/phone)

qed.js: UTM/gclid/fbclid → localStorage → POST payload → Telegram "📣 Source:" line
```

Decisions (so nobody re-litigates them):
- **No sGTM at this stage.** The Netlify functions already are the server-side channel — first-party, receives the lead, can hash everything. Deploying sGTM adds a Cloud Run bill and a domain for marginal gain at this volume. Revisit at >10k sessions/mo.
- **CAPI event name → `Lead`** (from CompleteRegistration), matched exactly by the browser Pixel event with the same `event_id` for dedup. `Lead` is what Meta lead-gen optimization expects.
- **Google Ads primary = direct conversion tag** on `lead_complete` (custom-event trigger filtered by `lead_type`, NOT page-URL — success is a DOM state, no thank-you URL). GA4 `generate_lead` is the secondary/analysis layer. Enhanced conversions from the form's email/phone, gated on consent.
- **Three conversion actions with relative values:** `Lead — franchise` (value 10), `Lead — venue` (value 3), `Lead — events` (value 1). Swap in real values when pricing lands.
- **Attribution to the CRM:** Telegram is the CRM. The `📣 Source:` line per lead is the lead-quality feedback loop — founders judge campaign quality from it weekly.

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
| Consent opt-in rate | > 65% | GTM/CMP |
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

**Prompt 2 — GTM + Consent Mode v2 via build injection**

```
No tag manager, GA4, or Meta Pixel exists on any page (verified: zero
gtag/googletagmanager/fbq matches repo-wide). qed.js pushes lead_intent /
lead_complete into a dataLayer nothing consumes. We're launching Meta + Google
Ads and need the client-side tag layer, gated behind Consent Mode v2
(denied-by-default — Spain/AEPD).

Implementation (mirror the existing build:seo pattern in build.mjs):
1. Add an inert <!-- build:analytics --> marker right after <meta name="viewport">
   in all 5 heads (7 if privacy/terms exist by now), and
   <!-- build:analytics-body --> right after each <body> tag.
2. Extend build.mjs to replace them when a GTM_ID env var is set (independent of
   the `if (brand)` branch — gate on GTM_ID itself): head marker gets (a) an
   inline Consent Mode v2 default snippet BEFORE the loader —
   ad_storage/ad_user_data/ad_personalization/analytics_storage all 'denied',
   wait_for_update:500 — then (b) the standard GTM loader with the GTM_ID; body
   marker gets the GTM noscript iframe. Unbranded/local builds keep the inert
   comments (tag-free previews), exactly like build:seo today.
3. Consent banner: lightweight, handmade-styled (tag/stamp aesthetic per
   PRODUCT.md, NOT a cookie-wall) fixed to bottom, two equal buttons
   Accept / Reject, persisting to localStorage ('qed-consent') and calling
   gtag('consent','update',...) on accept. Only render the banner when
   window.QED_CONFIG has a gtmId (add gtmId to the config build.mjs writes).
   Banner copy: EN baked in a new shared consent.js that injects it + ES keys in
   shared/i18n-common.js. Respect prefers-reduced-motion.
4. In qed.js, add data._consent = (localStorage 'qed-consent' value or 'denied')
   to the form POST payload, and in netlify/lib/forms.ts make fireMetaCapi return
   early unless _consent === 'granted'.

Do not add GA4/Pixel tags in code — they'll be configured inside the GTM
container. The deliverable is: markers, build injection, consent default +
banner, consent gate on CAPI.
```

**Prompt 3 — CAPI hardening (match quality, dedup, delivery)**

```
netlify/lib/forms.ts fireMetaCapi() fires a Meta CAPI event per lead but is
crippled three ways. Fix all three:

A) Client fields never sent: fireMetaCapi reads d._fbp/_fbc/_ua/_event_id/_url
   but shared/qed.js's submit handler (lines ~100-104) sends only FormData +
   lang + country. In qed.js before the fetch: add a small readCookie helper;
   set data._fbp = readCookie('_fbp'), data._fbc = readCookie('_fbc') ||
   (fbclid from the stored attribution (see localStorage 'qed-attr' if it
   exists, else location.search) ? 'fb.1.' + Date.now() + '.' + fbclid : ''),
   data._url = location.href, data._event_id = crypto.randomUUID ?
   crypto.randomUUID() : Date.now() + '-' + Math.random().toString(16).slice(2).
   Pass the same _event_id into the trackLeadComplete(...) push so a browser
   Pixel can later dedup via fbq eventID.

B) Server underuses data in hand: in forms.ts, have each of the three functions
   stash d._ua = event.headers['user-agent'] and d._ip =
   event.headers['x-nf-client-connection-ip'] before calling fireMetaCapi (keeps
   the signature unchanged; 3 call sites). In fireMetaCapi set
   user_data.client_ip_address from d._ip; hash and add ph (phone digits,
   normalize to 34-prefixed E.164 when 9-digit Spanish), fn, ln, ct (city),
   country ('es') from existing fields when present — SHA-256 lowercase-trimmed
   like the existing em. Rename event_name 'CompleteRegistration' → 'Lead'
   (the GTM-side Pixel event must also be 'Lead' — leave a comment). Append
   test_event_code from META_TEST_EVENT_CODE env var when set.

C) Delivery is nondeterministic: fireMetaCapi is `void fetch(...)` and every
   handler returns immediately after — Lambda freeze drops in-flight requests.
   Make fireMetaCapi async returning the fetch promise with
   AbortSignal.timeout(2000), log non-2xx like sendTelegram does, and in all
   three handlers run it in parallel with sendTelegram via Promise.allSettled
   so no latency is added but delivery is awaited.

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
4. **Accounts** — GTM container ID (per brand or shared), Meta Pixel ID + CAPI token (env vars META_PIXEL_ID / META_CAPI_TOKEN are already read by the code), Google Ads account for conversion actions.
5. **Venue/night list** for the hub #play section (existing open item — also unlocks consumer remarketing later).

## Deliberately NOT recommended

- **sGTM deployment** — Netlify functions already give a server-side CAPI path; revisit at scale.
- **Regularizing layouts/scorecards** — deliberate per PRODUCT.md; verifiers rejected every finding that touched them.
- **Instant Forms (Meta) as primary** — landing-page leads are higher intent and feed the same measurement spine; test Instant Forms later for franchise volume only.
- **Partial-lead capture on step-1 Continue** — GDPR/consent copy overhead + brand risk; revisit if step-2 abandonment shows up in GA4 funnels.
- **CAPTCHA** — honeypot + time-gate + rate-awareness is enough; don't add friction to the conversion.
