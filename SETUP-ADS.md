# Ad + analytics account setup (walkerOS destinations)

How to stand up the accounts, conversions, and env vars that activate the walkerOS destinations
shipped in the migration (see `MEASUREMENT-PLAN.md` for the taxonomy, CLAUDE.md "Analytics
(walkerOS)" for the as-built code). Until these are set, every destination is **inert** — the
code no-ops, nothing breaks.

> **You do this twice — QED and TDT have SEPARATE accounts.** Each brand's values go on that
> brand's own Netlify site (`landing.quizeatdrink.com` = QED, `landing.tardeodetrivia.com` = TDT).
> A few Google pieces can be shared across both (noted below); everything else is per-brand.

> **Platform UIs drift** — labels below are approximate. When a menu name differs, search the
> platform's help for the capability in **bold**.

---

## 0. Order of operations

All three platforms are quick now (Google moved to client-side — no developer-token approval to
wait on). Any order:

1. Amplitude, Meta, Google Ads — create the accounts/ids (sections 1–3).
2. Set the Netlify env vars per site (section 4).
3. Deploy (or, if already deployed, a redeploy picks the vars up) and run the verification (section 5).
4. Wire the conversions into live campaigns — last, after data is flowing (section 6).

Each platform section tells you where each value comes from.

---

## 1. Amplitude → `AMPLITUDE_API_KEY`

Used both client-side (baked into `config.js`) and server-side (lead events). One value per brand.

1. Create an **Amplitude organization/project in the EU data region** (the code posts to
   `api.eu.amplitude.com`; a US-region project will silently drop events). At signup pick EU, or
   in an existing org confirm the data region is EU. If your org is US-only, create a new EU org.
2. Create a **project per brand** (e.g. "QED" and "Tardeo de Trivia"). Separate projects keep the
   two brands' data apart.
3. **Settings → Projects → [project] → API Keys → API Key** (the ingestion key, not the secret
   key). This is `AMPLITUDE_API_KEY` for that brand.
4. No conversion setup needed — Amplitude is behavioural analytics. After data flows you'll build
   funnels there: `Lead Form Viewed → Lead Started → Lead Submitted`, plus engagement events.

Events you'll see (names are already mapped in code): `Page Viewed`, `Lead Started`,
`Lead Submitted`, `CTA Clicked`, `Lead Form Viewed`, `Cross-sell Clicked`, `FAQ Opened`,
`Scroll Depth Reached`, `Nav Clicked`, `Outbound Clicked`, `Consent Updated`, `Language Switched`.

---

## 2. Meta → `META_PIXEL_ID`, `META_CAPI_TOKEN`, `META_TEST_EVENT_CODE`

Per brand. The browser Pixel and the server CAPI share one Pixel/dataset per brand.

1. **Business Manager → Events Manager → Connect data source → Web → create a Pixel (dataset)**
   per brand. Copy the **dataset/Pixel ID** → `META_PIXEL_ID`.
2. In that dataset: **Settings → Conversions API → Generate access token**. Copy it →
   `META_CAPI_TOKEN` (this is a secret — server env only, never in `config.js`).
3. For smoke testing: **Events Manager → [dataset] → Test events** tab shows a
   **test event code** (e.g. `TEST12345`). Put it in `META_TEST_EVENT_CODE` temporarily so
   verification events land in the Test Events view instead of production. **Remove it before
   real launch** (with it set, events only appear as test events).
4. **Conversions the code sends** (already mapped): `lead complete → Lead` (standard, your primary
   conversion) and `lead start → InitiateCheckout` (standard, upper-funnel). Dedup between the
   browser Pixel and server CAPI is automatic (both send the same `event_id`).
5. **When you build campaigns:** optimize for **Lead**. Optionally add **InitiateCheckout** as a
   secondary/custom conversion for upper-funnel signal while lead volume is thin. Value-based
   bidding reads the `value`/`currency` the code sends: expected lead value in EUR, corporate 125 /
   celebrations 75 / venues 50 / partners 250, 150 or 100 by city size (`lead start` sends 20%).
6. **EMQ:** after real leads flow, check the dataset's **Event Match Quality** for `Lead`. The
   code sends hashed email/phone/name + `fbc`/`fbp` + IP + user-agent + `external_id`, so EMQ
   should be healthy (target > 6). Low EMQ usually means the Pixel isn't setting `_fbp` (check
   marketing consent is being granted in your test).

---

## 3. Google Ads → client-side gtag with enhanced conversions for leads

Client-side (the browser gtag fires the conversions with enhanced conversions for leads). No
developer token, no OAuth, no API — just three client ids per brand plus a toggle in the Google
Ads UI. Three env vars per brand.

### 3a. Conversion ID → `GOOGLE_ADS_CONVERSION_ID`
- The account's Google Ads tag id, format **`AW-XXXXXXXXXX`**. Google Ads →
  **Goals → Conversions → Google tag / Diagnostics**, or shown when you create a conversion action.
  **Per brand** (different accounts → different `AW-` ids).

### 3b. Two conversion actions → `GOOGLE_ADS_LABEL_COMPLETE`, `GOOGLE_ADS_LABEL_START`
- **Goals → Conversions → New conversion action → Website.** Create **two**, per brand:
  - full lead → **primary** (used for bidding) → its **conversion label** → `GOOGLE_ADS_LABEL_COMPLETE`
  - partial lead → **secondary** (not for bidding) → its **conversion label** → `GOOGLE_ADS_LABEL_START`
- The **label** is the short string paired with the `AW-` id in a conversion's `send_to`
  (`AW-XXXX/`**`the-label`**). It's shown in the action's tag setup ("Use Google tag manager / Use
  the Google tag" → the `send_to` value). The code combines it with `GOOGLE_ADS_CONVERSION_ID`.
- Let the sent `value`/`currency` drive value-based bidding (the code sends both: expected lead
  value in EUR, corporate 125 / celebrations 75 / venues 50 / partners 250, 150 or 100 by city size).

### 3c. Turn on Enhanced Conversions for Leads (the Google tag method)
- **Goals → Conversions → Settings** → accept the **customer-data terms** → enable
  **Enhanced conversions for leads** and choose the **Google tag** method (not the API — the page's
  gtag sends the user data). Do this per brand account. The code already provides the hashed
  email + name + city on each lead (gtag hashes them client-side); you just enable the feature.

> **No developer-token wait, no OAuth.** This replaced the earlier server-side API plan to keep
> setup simple. The trade-off: conversions are client-side, so an adblocker on a visitor's browser
> can block the gtag beacon for that visit (the same visitor's Meta conversion still lands via the
> server CAPI). Fine for a lead-gen site; revisit server-side only if adblock loss looks material.

---

## 4. Netlify env vars

Set on **each brand's site**: Netlify → **Site configuration → Environment variables**. `BRAND`,
`TELEGRAM_*`, and `BREVO_*` are already set from earlier work — leave them. Add:

| Var | Scope | Brand-specific? | Source |
|---|---|---|---|
| `META_PIXEL_ID` | client (config.js) | yes | Meta §1 |
| `AMPLITUDE_API_KEY` | client + server | yes | Amplitude §3 |
| `META_CAPI_TOKEN` | server secret | yes | Meta §2 |
| `META_TEST_EVENT_CODE` | server (testing only) | yes | Meta §3 — **remove after verifying** |
| `GOOGLE_ADS_CONVERSION_ID` | client (config.js) | yes | Google §3a |
| `GOOGLE_ADS_LABEL_COMPLETE` | client (config.js) | yes | Google §3b |
| `GOOGLE_ADS_LABEL_START` | client (config.js) | yes | Google §3b |

Google Ads is client-side now — no secrets, no per-account API creds. Just the `AW-` id + the two
conversion labels, plus enabling enhanced conversions (Google tag method) in the Google Ads UI (§3c).

**Delete the unused leftovers:** `PUBLIC_AMPLITUDE_API_KEY`, `PUBLIC_RUDDERSTACK_WRITE_KEY`.

You can set client ids on either brand first and verify incrementally — each destination activates
independently as its ids appear.

---

## 5. Deploy + verify

1. **Merge the PR** (goes live on both brands within a couple of minutes). Anything without env
   vars stays inert, so partial setup is safe.
2. **Consent:** on the live site, open the cookie banner → **Accept all**. Nothing measures without
   Analytics (Amplitude) / Marketing (Meta, Google) consent.
3. **page view / engagement → Amplitude:** Amplitude → **User Look-Up** or the live event stream;
   load a page, click a CTA, open an FAQ, scroll — you should see `Page Viewed`, `CTA Clicked`,
   `FAQ Opened`, `Scroll Depth Reached`.
4. **Lead → Meta (with `META_TEST_EVENT_CODE` set):** submit a real test lead on a funnel page.
   Events Manager → **Test events** should show `Lead` (from CAPI) **and** the browser Pixel `Lead`
   deduplicated to one. Check `InitiateCheckout` fires on step 1. Then **remove
   `META_TEST_EVENT_CODE`** and redeploy.
5. **Lead → Google Ads:** Google Ads → **Goals → Conversions** → your two actions should leave
   "No recent conversions" within a few hours of a real test lead. It's client-side (gtag), so use
   **Google Tag Assistant** (or the browser's Network tab, with adblock off) on the live page to see
   the `googleads.g.doubleclick.net` / `google.com/pagead` conversion fire on submit. Enhanced
   conversions show as "recording" in the conversion action's diagnostics once matches come in.
6. **Lead → Amplitude:** `Lead Submitted` appears (sent server-side, once per lead — the client
   Amplitude deliberately ignores leads so there's no double count).
7. Do a real submit on **each of the four funnels** (corporate, celebrations, venues, partners) —
   they carry different `funnel`/`product`/`value`, so this confirms all four map correctly.

---

## 6. After it's flowing (campaign wiring)

- **Meta:** set ad sets to optimize for **Lead**. Turn on **value optimization** to use the sent
  `value`. Build a retargeting audience from Pixel visitors who fired `InitiateCheckout` but not
  `Lead` (the abandoners) — that's the two-step form's payoff.
- **Google:** mark the **complete** action **Primary** (bidding) and **start** **Secondary**.
  Consider tROAS/value-based bidding on the sent conversion value.
- **Amplitude:** build the funnel `Lead Form Viewed → Lead Started → Lead Submitted` per `funnel`
  to see step-1→step-2 drop-off, and a retention/engagement view from the Tier 2/3 events.
- **Real values:** the `value` is typical deal size x an assumed close rate (the reasoning is in the
  comment above `leadValue()` in `netlify/lib/forms.ts`). Once real close rates are known, update
  `PAGE_LEAD_VALUE` / `PARTNER_TIER_VALUE` in `netlify/lib/forms.ts` (server, and the step-2 response
  the browser `lead complete` uses) and `LEAD_VALUE` in `shared/qed.js` (client fallback and
  `lead start`) together.

---

## Troubleshooting

- **Nothing in any platform:** consent not granted (check the banner), or you're on a
  `*.netlify.app` preview / localhost (analytics is disabled off the two production domains by
  design), or the env vars aren't on that brand's site.
- **Amplitude empty but Meta works:** wrong Amplitude data region (must be EU) or the key is a
  secret/deletion key rather than the ingestion API key.
- **Meta events but no match / low EMQ:** marketing consent wasn't granted in your test, so no
  `_fbp`/hashed identity was attached.
- **Google conversion not firing:** it's client-side gtag — check with Google Tag Assistant on the
  live page (adblock off). Common causes: `GOOGLE_ADS_CONVERSION_ID` / label not set on that brand's
  site, marketing consent not granted, an adblocker, or enhanced conversions not enabled (Google tag
  method) in the Google Ads UI.
