# Measurement plan — QED / Tardeo de Trivia

> **Status (2026-08-15): implemented on branch `walkeros-migration`.** Segment is gone; walkerOS
> is the collection layer (client `shared/walker.js` + server `netlify/lib/forms.ts`), Amplitude
> (EU) for analytics, Meta Pixel+CAPI and Google Ads (server-side) for ads, GA4 dropped. All
> destinations are inert until their per-brand env vars are set. See CLAUDE.md "Analytics
> (walkerOS)" for the as-built summary. This doc is the design of record for the taxonomy.

Target stack after the walkerOS migration:

- **walkerOS** as the single collection layer (browser + server collector), replacing the
  hand-rolled `analytics.js` snippet in `shared/consent.js` and the Segment HTTP calls in
  `netlify/lib/forms.ts`.
- **Amplitude** for product/behavioural analytics (funnel, retention, path).
- **Meta** (Pixel + Conversions API) and **Google Ads** for ad measurement and optimization.
- GA4 stays optional / reporting-only (not required by this plan).

This is the *what and why* of measurement — one canonical event taxonomy that every
destination reads from. Naming per destination is a mapping concern (section 7), not a
reason to invent parallel event names in the code.

---

## 1. Design principles

1. **One taxonomy, many destinations.** We emit walkerOS `entity action` events once. Each
   destination (Amplitude, Meta, Google Ads) maps from that single stream. We never call an
   ad SDK directly from page code again — walkerOS destinations own that.
2. **Business object, not UI widget.** Event names describe what happened to a business
   entity (`lead`, `page`, `consent`), not which button was clicked. The button is a
   property.
3. **Funnels are a dimension, not an event name.** The four lead funnels
   (corporate / celebrations / venues / partners) share the `lead` entity and differ by a
   `funnel` + `product` property. This keeps Amplitude funnels and audiences composable and
   means a new funnel needs zero new event names.
4. **Keep the two-touch split.** `lead start` (step 1 partial) and `lead complete` (step 2
   full) stay distinct events, exactly as today's `Lead Started` / `Form Submitted`. A
   Google Ads / Meta "Lead" conversion mapped to `lead complete` must never include
   abandoners.
5. **Client for behaviour, server for conversions.** Pageviews and engagement fire from the
   browser walker (fast, cheap, fine to lose a few). The money events (`lead start`,
   `lead complete`) fire **server-side** from the Netlify functions via a walkerOS server
   collector — ad-blocker resistant, and the only place we can safely hash PII. Pixel-side
   browser events share an `event_id` with the server event for dedup (section 8).
6. **Consent is declared, not hand-gated.** Each destination declares the consent state it
   needs; walkerOS queues and releases events itself. We stop hand-writing
   `if (consent !== "granted") return`.

---

## 2. Identity & consent

### Identity (walkerOS `user`)
| walkerOS `user` field | Source | Notes |
|---|---|---|
| `id` | `qed-eid` (localStorage UUID, already exists) | Durable pseudonymous id. Amplitude `user_id` is left unset (anonymous lead-gen); this is the stitch key. |
| `device` | walkerOS device id (cookie/localStorage) | Per-browser. |
| `session` | walkerOS session logic | Replaces our implicit sessions. |
| `hash` (em/ph/fn/ln) | form fields, SHA-256 | **Server-side only, marketing consent only.** Feeds Meta CAPI `user_data` and Google enhanced conversions. |

Click-ids (`gclid`, `wbraid`, `gbraid`, `fbclid`, `msclkid`, `ttclid`) and `fbc`/`fbp` are
attribution identifiers, captured first-touch (30-day, click-wins — keep the existing
`shared/qed.js` logic) and carried as event `data`, not `user`. `fbc`/`fbp`/hashed PII ride the
**marketing** gate; UTMs + click-ids ride the **analytics** gate (needed to attribute at all).

### Meta browser identity: fbc / fbp (decided)
Server-side CAPI lead quality depends on Meta's browser cookies `_fbc` (click id) and `_fbp`
(browser id). Decision:

- **Load the Meta Pixel as a walkerOS browser destination, under marketing consent.** It sets
  `_fbp` / `_fbc` and fires the browser-side `PageView` + `Lead`. Today no Pixel loads, so
  `_fbp` never exists and `_fbc` is only synthesized from a stored `fbclid` — a real
  match-quality gap this closes.
- **Read the cookies live at submit time**, not via hidden form fields. `collect()` in
  `shared/qed.js` already does this for `_fbc`; extend it to `_fbp`. A hidden field is stamped
  at page render — often before the Pixel (and before consent) — so it goes stale; reading
  `document.cookie` at submit always gets the freshest value.
- **Share one `event_id`** between the browser Pixel `Lead` and the server CAPI `Lead` so Meta
  deduplicates the pair (Pixel blocked → CAPI covers; JS fails → Pixel already fired).
- Keep synthesizing `_fbc` from a stored `fbclid` when the cookie is absent (already done);
  optionally synthesize `_fbp` the same way. All of this is marketing-gated, so an
  analytics-only visitor has no Meta cookies and is measured but never ad-matched — intended.

Google mirrors this: browser gtag/remarketing tag sets its cookies client-side; enhanced
conversions get hashed PII from the server. `gclid`/`wbraid`/`gbraid` already flow as `data`.

### Consent mapping (keep the 4 categories)
| Category | Gates | Destinations that require it |
|---|---|---|
| necessary | always on | — |
| functional | language memory, dismissed notices | none (first-party prefs only) |
| **analytics** | measurement | **Amplitude**, GA4 (reporting), Meta/Google in reporting-only mode |
| **marketing** | ad match + optimization | **Meta CAPI/Pixel**, **Google Ads** (full match with hashed PII / click-ids) |

walkerOS consent keys: `{ functional, analytics, marketing }` — 1:1 with today's model, so
the banner in `shared/consent.js` stays as-is; only the plumbing under it changes.

**Late consent and the server-side lead events.** The banner is held back while a lead form is
on screen, so a visitor can send step 1 (and step 2) before choosing. Client events wait in
walkerOS's queue and flush on a later grant; the server events can't wait, and the functions
drop any lead whose `_consent` isn't `"granted"`. So `qed.js` keeps each lead payload sent
without consent and, on a later analytics grant, POSTs it again with `_replay:"consent"` and the
fresh `_consent` / `_consentCategories`. The functions answer a replay with `sendLeadEvent`
only (no Telegram, Brevo or portal). Same `_event_id`: Meta dedups it against the Pixel Lead and
Amplitude against `insert_id`. Held in memory, so a visitor who leaves before choosing is never
replayed (nor ever measured, which is what no consent means).

---

## 3. Event taxonomy

Tiered so we can ship Tier 1 first and add the rest without re-architecting.

### Tier 1 — conversions (must-have, launch blocker)
| walkerOS event | Fires when | Side |
|---|---|---|
| `page view` | Every page load, post analytics-consent | client |
| `lead start` | Visitor clears step 1 (name + email) and advances | **server** (+ client pixel for dedup) |
| `lead complete` | Full step-2 submission accepted | **server** (+ client pixel for dedup) |

### Tier 2 — engagement (high value, fast follow)
| walkerOS event | Fires when |
|---|---|
| `cta click` | Any primary CTA (hero, sticky, section) — `data.placement` says which |
| `form view` | A lead form scrolls into view (denominator for start-rate) |
| `crosssell click` | Cross-sell / comparison-table link to another funnel |
| `faq open` | A FAQ `<details>` is opened |

### Tier 3 — diagnostic (nice-to-have)
| walkerOS event | Fires when |
|---|---|
| `scroll reach` | 25 / 50 / 75 / 100% depth (`data.depth`) |
| `nav click` | Header / footer nav link |
| `language switch` | Brand/domain language toggle |
| `consent update` | Banner decision (`data.analytics`, `data.marketing`, `data.functional`, `data.action`=accept/reject/manage) |
| `outbound click` | Link off-site (El Hachazo case study, socials) |

---

## 4. Property dictionary

### Globals (walkerOS `globals` — on every event)
| Property | Example | Source |
|---|---|---|
| `brand` | `QED` / `TDT` | build-time `BRAND` (baked into a `data-elbglobals` on `<body>`) |
| `site` | `quiz-eat-drink` / `tardeo-de-trivia` | derived from brand/lang (matches today's values) |
| `language` | `en` / `es` | `<html lang>` |
| `page_type` | `landing` | constant for this site |
| `section` | `home` / `corporate` / `celebrations` / `venues` / `partners` / `privacy` / `terms` | `window.QED_SITE` (hub = `home`) |
| `product` | `corporate-event` / `celebration-event` / `venue-partnership` / `franchise-partnership` / `null` | keep the existing map (`shared/consent.js`, `forms.ts`) |
| `env` | `production` | never emit off the two prod domains (keep `analyticsEnabled()` guard) |

### `page view`
`data`: `{ title, path, referrer }` (referrer `$direct` convention retained). Attribution
(`utm_*`, click-ids, `ref`) attaches here too for first-touch landing.

### Naming convention
**All event property keys are `snake_case`** (`event_type`, `group_size`, `guest_of_honour`).
The form field `name=` attributes stay camelCase (`eventType`, `groupSize`, …) — renaming them
would ripple into the HTML, the Telegram messages, and Brevo. The camelCase → snake_case
rename, and the city normalization below, happen as a **mapping step** in the walker /
collector (a field map applied when the form snapshot becomes a `lead` event), not by editing
the forms. Globals, click-ids, and `utm_*` are already snake_case.

### `lead start` and `lead complete`
Shared `data` (superset — each funnel sends the subset it collects):

| Property | Type | Funnels | Source field | Notes |
|---|---|---|---|---|
| `funnel` | enum `corporate/celebrations/venues/partners` | all | `page` | the clean funnel dimension |
| `product` | enum (see globals) | all | derived | value-bidding + audience |
| `step` | `1` / `2` | all | `_step` | redundant with event name, kept for single-query splits |
| `value` | number (EUR) | all | derived | expected value per lead, `forms.ts` `leadValue(page, city)`: see section 6. `lead start` carries 20% of the complete value |
| `currency` | `EUR` | all | const | |
| `event_id` | uuid | all | `_event_id` | pixel⇄CAPI + client⇄server dedup key |
| `city` | **enum** `madrid/valencia/murcia/santiago/barcelona/other` | all | `city` (normalized) | see below — the raw string never leaves the server |
| `event_type` | string | corporate, celebrations | `eventType` | option value |
| `format` | string | corporate, venues | `format` | |
| `group_size` | string | corporate, celebrations | `groupSize` | |
| `date` | date | corporate, celebrations | `date` | |
| `guest_of_honour` | string | celebrations | `guestOfHonour` | |
| `venue_name` | string | venues | `venueName` | |
| `nights` | string | venues | `nights` | |
| `venue_situation` | string | partners | `venueSituation` | |
| `premises_location` | string | partners | `premisesLocation` | |
| `message` | string | all | `message` / `about` | **do not** forward free-text to ad destinations (noise + PII risk); Amplitude only, or drop |

### City normalization
The forms collect city as **free text** (a custom `<select>` on most, but partners/venues take
typed input, and autocomplete/typos leak through). Free text fragments Amplitude segments and
Meta/Google audiences — `Madrid`, `madrid`, `Madrid ` become three cohorts. So:

- The event `city` property is a **normalized slug**, not the raw string: lowercase + strip
  accents + trim, then match against a small alias table (e.g. `Santiago de Compostela` →
  `santiago`, `Barna` → `barcelona`). No match → `other`. The five known slugs match Brevo's
  built-in `CITY` category enum, so the taxonomies line up.
- **The raw typed city stays server-side only** — it still goes to Telegram and to Brevo's
  free-text `LEAD_CITY` attribute (the CRM caveat in CLAUDE.md), but the raw value is **never**
  an event property sent to Amplitude or the ad platforms. Normalize once, in the collector.
- Keep `other` observable: log the unmatched raw values so the alias table can grow as new
  cities launch (a new launch already touches the OG-image + city-list steps in CLAUDE.md).

PII (`email`, `phone`, `firstName`, `lastName`) is **never** an event property. It becomes
hashed `user.hash.*` server-side under marketing consent, exactly as today.

---

## 5. Destination mapping matrix

walkerOS event → each platform's native name. This table is the destination config, not new
code names.

| walkerOS event | Amplitude event | Meta (Pixel + CAPI) | Google Ads |
|---|---|---|---|
| `page view` | `Page Viewed` | `PageView` (standard) | page load / remarketing tag |
| `form view` | `Lead Form Viewed` | `ViewContent` | — |
| `lead start` | `Lead Started` | `Lead` *(or `InitiateCheckout`)* — **step-1 conversion action** | conversion: `Lead Started` |
| `lead complete` | `Lead Submitted` | `Lead` / `CompleteRegistration` — **step-2 conversion action** | conversion: `Lead Submitted` (primary) |
| `cta click` | `CTA Clicked` | (optional custom `CTAClick`) | — |
| `crosssell click` | `Cross-sell Clicked` | — | — |
| `faq open` | `FAQ Opened` | — | — |
| `scroll reach` | `Scroll Depth Reached` | — | — |
| `consent update` | `Consent Updated` | — | — |

Notes:
- **Keep step 1 and step 2 as separate Meta/Google conversion actions.** `lead complete` is the
  **primary** conversion — the paid optimization goal. `lead start` is registered as a
  **secondary (non-primary) conversion action** in both Meta and Google (decided): it feeds
  retargeting audiences and gives upper-funnel optimization signal while lead volume is thin,
  without polluting the primary CPA. Watch reporting for double-counting and demote it to
  audience-only if the secondary signal proves noisy.
- Amplitude has no first-party walkerOS destination today; use the walkerOS **API/custom
  destination** to POST Amplitude's HTTP V2 API server-side (mirrors how the funnel events
  already run server-side), or wrap the Amplitude Browser SDK as a web destination for
  Tier 2/3 engagement events. Decision in section 9.
- `value` + `currency` flow to Meta value optimization and Google tROAS: Meta as
  `custom_data.value/currency` (CAPI) and the Pixel's Lead params, Google as the gtag
  conversion `value` (+ `transaction_id` = event id). Expected-value estimates, see section 6.

---

## 6. Value & deduplication

- **Value:** carried on `lead start` / `lead complete` as `value`/`currency` (EUR). Since
  2026-09 it is an expected value per completed lead, typical deal size x an ASSUMED
  lead-to-deal rate (`leadValue(page, city)` in `netlify/lib/forms.ts`):

  | Funnel | `lead complete` | `lead start` (20%) | Basis |
  |---|---|---|---|
  | corporate | 125 | 25 | B2B event ~500 € x 25% |
  | celebrations | 75 | 15 | B2C private event ~300 € x 25% |
  | venues | 50 | 10 | parked product, placeholder |
  | partners, large city (≥500k: Madrid, Barcelona, Valencia, Sevilla, Zaragoza, Málaga) | 250 | 50 | ~5% signed x 5,000 € first year |
  | partners, medium city (100k-500k, list in `forms.ts`) | 150 | 30 | ~5% x 3,000 € |
  | partners, small / unknown | 100 | 20 | ~5% x 2,000 € |

  The city tier is scored server-side from the typed city (accent-stripped, whole-word match,
  large before medium). The step-2 response returns `{ok:true, value}` and `shared/qed.js`
  sends that same number on the browser Pixel `lead complete`, so the deduped Pixel/CAPI pair
  agrees; the client `lead start` uses the page default (partners = 150 x 20% = 30).
  **Recalibrate** once Brevo has a few months of won deals: value = average won deal x won /
  completed leads, per funnel. Only the ratios between funnels steer the bidding.
- **Mapping fix (2026-09).** In walkerOS 4.3.2 a rule `data` written as `{ value: "data.value" }`
  is a static value: it resolved to the literal string `"data.value"`, so Meta (Pixel + CAPI)
  got Leads with no value. Rules now use `{ map: { ... } }` (CAPI nests it under
  `custom_data`). The same audit found the client Pixel and gtag never loaded (`loadScript`
  unset) and gtag never sent a conversion (its push requires a rule `name`); both fixed in
  `scripts/walker.entry.mjs`. The CAPI `user_data` map no longer passes `fbclid` (the
  destination turned it into an `fbc` stamped with the send time, overwriting the click-time
  `fbc` from `qed.js`); `event_source_url` = the page URL without its query string.
- **Dedup:** every lead event carries `event_id` (uuid). The browser Pixel event and the
  server CAPI event for the *same* submission share it (Meta `event_id`, Google
  `transaction_id`/order-id equivalent). Step 1 and step 2 use **different** ids — they are
  distinct conversions, not a client/server pair. This preserves today's behaviour.
- Amplitude uses `event_id` as `insert_id` for its own idempotency.

---

## 7. What changes vs today (migration deltas)

| Today | After |
|---|---|
| `analytics.js` snippet in `shared/consent.js` | walkerOS browser collector + web destinations |
| `sendToSegment()` HTTP calls in `forms.ts` | walkerOS server collector + Meta CAPI / Google / Amplitude server destinations |
| `page` (named per section) | `page view` with `section`/`product` globals |
| `Lead Started` / `Form Submitted` | `lead start` / `lead complete` (same semantics, entity-action name) |
| Segment as fan-out hub | walkerOS as fan-out hub (self-hosted, no Segment MTU cost) |
| No engagement events | Tier 2/3 events via `data-elb` DOM tagging |
| Hand-gated consent (`if consent !== granted`) | Destination-declared consent, walkerOS queues |
| Segment `anonymousId` = `qed-eid` | walkerOS `user.id` = `qed-eid` (unchanged key) |

Identity, attribution capture, honeypot/timing anti-bot, and the consent banner UI all stay.
The migration is a transport + taxonomy swap, not a re-instrumentation of the site's logic.

---

## 8. Decisions (resolved) & remaining questions

Resolved:
1. **Scope for v1: all three tiers.** Ship the full taxonomy (conversions + engagement +
   diagnostic) in the migration. Tier 2/3 via `data-elb` DOM tagging.
2. **Amplitude ingestion: hybrid.** Lead events (`lead start` / `lead complete`) go server-side
   via Amplitude HTTP V2 from the Netlify collector; Tier 2/3 engagement uses the Browser SDK.
   See the fbc/fbp note (section 2) — leads also carry live browser cookies read at submit.
3. **`lead start`: secondary conversion action** in Meta + Google (not audience-only).
   `lead complete` remains the primary/optimization conversion.
4. **GA4: dropped.** Retired with the Segment teardown. Amplitude owns product analytics;
   Meta + Google Ads own ad measurement.

Still open (does not block starting):
- **Where the walkerOS server collector runs** — inside the existing three Netlify functions
  (least infra, reuses the current PII-hashing + consent code path) vs a dedicated collector
  endpoint. Leaning: inside the functions.
- **`_fbp` synthesis fallback** — whether to synthesize `_fbp` when the Pixel hasn't set it,
  or accept the (small) match-rate loss. Low stakes; decide during build.
```
