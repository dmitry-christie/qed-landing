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

## 0. Order of operations (what blocks what)

1. **Google Ads developer token first** — it needs approval (often 1–3 business days for Basic
   access). Apply on day 1 so it isn't the bottleneck; everything else you can do while you wait.
2. Amplitude (fast) and Meta (fast) can be done any time.
3. Set Netlify env vars per site.
4. Deploy (merge the PR) and run the verification section.
5. Wire the conversions into live campaigns (last — after data is flowing).

The full env-var checklist is in section 5; each platform section below tells you where each value
comes from.

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
   bidding reads the `value`/`currency` the code sends (partners 10 / venues 3 / corporate 1 /
   celebrations 1 EUR — proxy weights until real pricing).
6. **EMQ:** after real leads flow, check the dataset's **Event Match Quality** for `Lead`. The
   code sends hashed email/phone/name + `fbc`/`fbp` + IP + user-agent + `external_id`, so EMQ
   should be healthy (target > 6). Low EMQ usually means the Pixel isn't setting `_fbp` (check
   marketing consent is being granted in your test).

---

## 3. Google Ads → server-side enhanced conversions for leads

The heaviest setup. Seven env vars per brand, but several pieces are **shareable** across both
brands if both Ads accounts sit under one Google login / manager account.

### 3a. Developer token (apply first — has a lead time) → `GOOGLE_ADS_DEVELOPER_TOKEN`
- In a Google Ads **manager (MCC) account**: **Tools → API Center**. Apply for API access; you
  need at least **Basic access** to upload conversions to production. **Shareable** across both
  brands if they're under the same MCC.

### 3b. OAuth2 client → `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`
- **Google Cloud Console → new project → APIs & Services → Enable "Google Ads API"**.
- **Credentials → Create OAuth client ID → Desktop app**. Copy client id → `GOOGLE_ADS_CLIENT_ID`,
  client secret → `GOOGLE_ADS_CLIENT_SECRET`. **Shareable** across both brands.
- **Refresh token:** authorize the Google account that can access the Ads account(s), with scope
  `https://www.googleapis.com/auth/adwords`. Easiest path: **OAuth 2.0 Playground**
  (developers.google.com/oauthplayground) → gear icon → "Use your own OAuth credentials" → paste
  client id/secret → authorize the adwords scope → exchange for a **refresh token**. Copy →
  `GOOGLE_ADS_REFRESH_TOKEN`. If one Google login has access to BOTH Ads accounts, one refresh
  token works for both; only `CUSTOMER_ID` differs.

### 3c. Account ids → `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID`
- `GOOGLE_ADS_CUSTOMER_ID` = the **10-digit Ads account id** of the brand (top-right in Google
  Ads, digits only — the code strips dashes). **Per brand.**
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID` = the **MCC id** (digits only), only if the account is accessed
  through a manager account. Optional; omit if not using an MCC. **Shareable.**

### 3d. Enable Enhanced Conversions for Leads
- **Google Ads → Goals → Conversions → Settings → Customer data terms**, accept, then enable
  **Enhanced conversions for leads** and choose the **Google Ads API** method (not gtag/GTM — the
  server uploads via the API). Do this per brand account.

### 3e. Conversion actions → `GOOGLE_ADS_CONVERSION_COMPLETE`, `GOOGLE_ADS_CONVERSION_START`
- Create **two conversion actions** per brand (**Goals → Conversions → New → Import → skip the
  gtag/manual, you'll upload via API**):
  - one for the full lead → **primary** (used for bidding). Its resource name →
    `GOOGLE_ADS_CONVERSION_COMPLETE`.
  - one for the partial lead → **secondary** (not for bidding). Its resource name →
    `GOOGLE_ADS_CONVERSION_START`.
- The **resource name** format is `customers/<CUSTOMER_ID>/conversionActions/<ACTION_ID>` — get
  the action id from the conversion action's URL or via the API; the code passes it verbatim as
  `conversionAction`. **Per brand** (different accounts → different ids).
- Set a value/currency on the actions or let the uploaded `conversionValue`/`currencyCode` drive
  value-based bidding (the code sends both).

> If the API/developer-token approval is slow and you want Google live sooner, the alternative is
> a client-side Google Ads tag — but that's a separate change (this migration deliberately does
> Google server-side only). Flag me if you want that fallback.

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
| `GOOGLE_ADS_DEVELOPER_TOKEN` | server secret | shareable | Google §3a |
| `GOOGLE_ADS_CLIENT_ID` | server secret | shareable | Google §3b |
| `GOOGLE_ADS_CLIENT_SECRET` | server secret | shareable | Google §3b |
| `GOOGLE_ADS_REFRESH_TOKEN` | server secret | shareable* | Google §3b |
| `GOOGLE_ADS_CUSTOMER_ID` | server | yes | Google §3c |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | server | shareable (optional) | Google §3c |
| `GOOGLE_ADS_CONVERSION_COMPLETE` | server | yes | Google §3e |
| `GOOGLE_ADS_CONVERSION_START` | server | yes | Google §3e |

\* the refresh token is shareable only if one Google login has access to both Ads accounts.

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
   "No recent conversions" within a few hours of a real test lead. Function logs (Netlify →
   Functions → book-event) will show `Google Ads upload failed:` with a reason if a credential is
   off — check there first.
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
- **Real values:** the `value` weights (partners 10 / venues 3 / corporate 1 / celebrations 1) are
  proxies. When you have real average deal values, update `LEAD_VALUE` in `netlify/lib/forms.ts`
  (server) and `LEAD_VALUE` in `shared/qed.js` (client Pixel) together, and rebuild
  `shared/walker.js` if the client one changed (`npm run walker:build`).

---

## Troubleshooting

- **Nothing in any platform:** consent not granted (check the banner), or you're on a
  `*.netlify.app` preview / localhost (analytics is disabled off the two production domains by
  design), or the env vars aren't on that brand's site.
- **Amplitude empty but Meta works:** wrong Amplitude data region (must be EU) or the key is a
  secret/deletion key rather than the ingestion API key.
- **Meta events but no match / low EMQ:** marketing consent wasn't granted in your test, so no
  `_fbp`/hashed identity was attached.
- **Google upload errors:** read the Netlify function log line — common causes are a developer
  token still in "test" access (can't write to production), a stale/rescoped refresh token, or a
  conversion action resource name from the wrong account.
