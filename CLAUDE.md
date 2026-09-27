# QED / Tardeo de Trivia — landing site

Static, bilingual marketing pages for a pub-quiz company. **One codebase serves two
brands** on two domains, differentiated only at build time:

- **QED** (English) → https://landing.quizeatdrink.com  (`BRAND=QED`)
- **Tardeo de Trivia** (Spanish) → https://landing.tardeodetrivia.com  (`BRAND=TDT`)

No framework. Plain HTML + CSS + vanilla JS, built by `build.mjs`, hosted on Netlify with a
few serverless lead-capture functions.

## Pages

Each page is a folder with its own `index.html`:

- `/` (root `index.html`) — the hub/homepage
- `/corporate/`, `/celebrations/` — event audiences (2-step lead form → `book-event`)
- `/venues/` — host-venue signup (`venue-apply`)
- `partners/` — franchise (`franchise-apply`). Folder name ≠ URL: published at `/franchise/`
  on QED and `/franquicias/` on TDT (see "Per-brand URL slugs").
- `/privacy/`, `/terms/` — legal

Shared CSS/JS/images live in `/shared/`.

## i18n model (important)

**English is baked into the HTML. Spanish is swapped in at runtime.**

- Each translatable element has `data-i18n="key"` (or `data-i18n-content|ph|aria|href` for
  attributes). The baked text is the English.
- Spanish strings live in `shared/i18n-*.js` as `window.QED_ES[key]`. `shared/i18n.js`
  replaces the text when the language is ES.
- Each page loads `i18n-common.js` (shared keys: footer, forms, consent, cross-sell,
  comparison table, About) plus its own `i18n-<page>.js` (page-specific keys, prefixed
  `h.` hub, `c.` corporate, `cel.` celebrations, `v.` venues, `p.` partners, `pr.` privacy,
  `tm.` terms).

**When you add or change copy:** edit the baked English in the HTML **and** the matching ES
key in the right i18n file. Every `data-i18n*` key must have a Spanish string, or the ES
site leaks English — a page renders `key` in English if its ES value is missing. After copy
changes, confirm every `data-i18n*` key referenced by a page (after the About partial is
injected) exists in that page's merged `QED_ES` dictionary. Quickest check — eval the two
dictionaries into a `window` shim, then diff against every key in the page **plus
`shared/about.partial.html`** (the partial's keys only appear post-build):

```bash
node -e 'global.window={};const f=require("fs"),L=p=>new Function("window","Object",f.readFileSync(p,"utf8"))(window,Object);["shared/i18n-common.js","shared/i18n-partners.js"].forEach(L);const h=f.readFileSync("partners/index.html","utf8")+f.readFileSync("shared/about.partial.html","utf8");console.log([...new Set([...h.matchAll(/data-i18n(?:-(?:content|ph|aria|href))?="([^"]+)"/g)].map(m=>m[1]))].filter(k=>!(k in window.QED_ES)))'
```

It also catches the reverse: keys left orphaned in the dictionary after a section is rewritten.

Conventions: no em dashes in copy. Localize currency and tax (`€99` / `+ VAT` in English,
`99 €` / `+ IVA` in Spanish). Counters (`data-count`) format via `useGrouping:"always"` so ES
reads `6.700`; the ES default drops the separator on four digits and would disagree with the
printed one-pager.

The legal entity differs by brand: baked English names **QED Imperium Ltd** (UK), the ES
strings name **Tardeo de Trivia SL · CIF B88885199**. TDT must show only the Spanish entity —
`foot.legal`, `pr.who.p` (privacy controller) and `tm.who.p` (terms) all have to agree.

**The franchise page publishes no revenue-share percentages and no ad-spend figure.** Each
stream carries a different rate and each steps down with volume, so any single number on the
page is wrong for the others; the page names what is shared and the founders give figures on
the first call. This is a decision, not an omission — don't "fix" it by adding numbers back.
If they ever go up, the transparency line under the block needs its effective date again.

## Shared About section (single source)

The "About us" section is identical on 5 pages, so it is **not** duplicated. It lives once in
`shared/about.partial.html` and is stamped into each page's `<!-- build:about -->` marker by
`build.mjs` on every build. Edit the partial once; every page updates. Its copy is still
translated at runtime via the `about.*` keys in `i18n-common.js`.

## build.mjs (runs on Netlify)

Reads deploy env vars and rewrites files in the ephemeral build (never committed):

- Regenerates `config.js` from `BRAND` / `DEV_NOTICE` / `DEFAULT_LANGUAGE`.
- Injects the About partial at every `<!-- build:about -->` marker (all builds).
- Branded builds: injects canonical/hreflang/OG SEO tags at `<!-- build:seo -->`, sets
  `<html lang>`, swaps the favicon/apple-touch-icon/`og:image` to the brand's asset
  (`BRAND_ASSETS`), and — on TDT — rewrites `<title>`/meta `content` for every tag carrying
  `data-i18n(-content)` to that key's Spanish string (see "Social preview images" below).
- Reads the per-brand **client-side** ad/analytics ids (`META_PIXEL_ID`, `AMPLITUDE_API_KEY`,
  `GOOGLE_ADS_CONVERSION_ID` + `GOOGLE_ADS_LABEL_COMPLETE`/`GOOGLE_ADS_LABEL_START`, optional
  `WALKER_DEBUG`) into the `config.js` object. Any unset id is omitted, which keeps that
  destination inert in `shared/walker.js`. The one secret (Meta CAPI token) never comes here —
  it stays as function-runtime env (see Analytics).

Committed source keeps the markers; the build fills them. To run locally without dirtying the
tree: `git add -A`, `node build.mjs`, inspect, then
`git checkout -- . && rm -rf franchise franquicias _redirects` to restore. The `rm` is needed
because those are generated and gitignored, so `git checkout` leaves them behind and the next
build inherits them.

**Never `git add -A` while a built tree is on disk.** The build deletes `CLAUDE.md`,
`build.mjs` and the other internal files from the working tree, so staging at that point
records the deletions and can lose uncommitted edits. Recovery: `git fsck --unreachable |
grep blob`, then `git cat-file -p <sha>` to find the orphaned staged version.

## Per-brand URL slugs

`PAGES` in build.mjs lists **source folders**. `BRAND_SLUGS` gives a page a different
published path per brand (`partners/` → `/franchise/` on QED, `/franquicias/` on TDT), and
everything URL-shaped resolves through `slugFor(brand, page)`: sitemap, canonical, **both**
hreflang alternates, `og:url`, the folder renamed into the publish tree, and the `_redirects`
301s. Get one side of the hreflang pair wrong and the two pages stop counting as translations.

The rename runs last, after every step that reads a page by its source folder. Each branded
build 301s **every other known path** onto its own — the source folder (old inbound links,
ads) *and* the other brand's slug. That second one isn't cosmetic: internal links are baked
with the **QED** path and only swapped to the TDT one at runtime by `data-i18n-href=
"foot.partnerhref"`, so without it a crawler or a JS failure on TDT hits a 404 on `/franchise/`.
**`BRAND_SLUGS` and `foot.partnerhref` must change together.**

Unbranded local builds copy the folder to every brand's path instead of renaming, so both the
baked EN links and the ES ones resolve in preview.

## Social preview images (og:image / favicon)

Link-preview crawlers (WhatsApp, Facebook, Slack, iMessage…) fetch the raw HTML and never run
`shared/i18n.js`, so a `data-i18n*` key alone is not enough for `<title>`, meta description, or
`og:title`/`og:description` — build.mjs must bake the real Spanish text into `content=` at build
time for TDT (see `localizeHead()`). **Every `og:title`/`og:description` tag must carry a
`data-i18n-content="key"`** (reuse the page's title/metadesc key, or add an `*.ogtitle`/`*.ogdesc`
key, as `h.ogtitle`/`h.ogdesc` and `p.ogdesc` do) — one without it silently ships English on TDT.

Brand-specific image/icon assets, swapped by `BRAND_ASSETS` in build.mjs:

| | QED | TDT |
|---|---|---|
| favicon / apple-touch-icon | `shared/qed-logo.png` | `shared/tardeo-logo.png` |
| `og:image` (1200×630) | `shared/og-image.png` | `shared/og-image-tdt.png` |

**`shared/og-image-tdt.png` bakes the tagline and city list as pixels, not live text.**
Regenerate it with `python3 shared/make-og-image-tdt.py` (needs Pillow + `rsvg-convert`,
`brew install librsvg`) whenever:
- a new city launches or the city list changes,
- the `h.foot.tagline` copy changes (keep the script's `TAGLINE` constant in sync with it),
- the Tardeo logo (`shared/tardeo-logo.svg`) changes.

There's no equivalent regen step for the QED image (`og-image.png`) — it was hand-made; if QED's
city list changes, it needs manual editing or a comparable script.

## Analytics (walkerOS)

**walkerOS** is the collection layer (it replaced Segment). The full event taxonomy — event
names, snake_case properties, the redundant Pixel+CAPI setup, city normalization — is specified
in **`MEASUREMENT-PLAN.md`**; read it before changing any event.

**The bundle.** `shared/walker.js` is a vendored IIFE built from `scripts/walker.entry.mjs` by
`npm run walker:build` (esbuild, not the walkerOS CLI — the CLI crashes under this Node). It is
**committed**, not built on Netlify, so a bundling failure can't break the live deploy.
**Rebuild it and commit whenever `scripts/walker.entry.mjs` or a `@walkeros/*` version changes.**
`scripts/` is stripped from the publish tree by `build.mjs`; only `shared/walker.js` ships.

**Brand-agnostic.** QED and TDT have SEPARATE Meta / Google Ads / Amplitude accounts, so no id
is baked into `walker.js` — it reads them from `window.QED_CONFIG` (per-brand `config.js`, from
`build.mjs` env vars). Inert-safe: a destination loads only when its id is set AND the host is a
real production domain (never localhost / `*.netlify.app`).

**Client (`shared/walker.js`, loaded on all 7 pages before `consent.js`).** The browser source
auto-fires `page view`; `shared/qed.js` fires engagement (Tier 2/3: `cta click`, `form view`,
`crosssell click`, `faq open`, `scroll reach`, `nav click`, `outbound click`) and the browser
Pixel `lead complete` (id = the submission's `_event_id`, so it dedups against the server CAPI
Lead). Every event carries globals (`brand`/`site`/`section`/`product`/`language`/`env`) and a
`user` seeded from the durable `qed-eid`. Client destinations: **Amplitude** (via the API
destination → EU HTTP V2; ignores the lead events, which are sent server-side), the **Meta Pixel**
(allowlist: only PageView + Lead), and **Google Ads** (gtag, allowlist: only the lead conversions,
with **enhanced conversions for leads** — email + name + city read from the marketing-gated lead
event `data` and hashed by gtag). `qed.js` fires `lead start` client-side too (Google secondary
conversion; the Pixel and Amplitude both ignore it).

**Lead value** (`leadValue(page, city)` in `forms.ts`, EUR per completed lead = typical deal x
assumed close rate; assumptions, recalibrate from real Brevo close rates): corporate 125
(500 € x 25%), celebrations 75 (300 € x 25%), venues 50 (placeholder), partners by city
population tier: large ≥500k 250, medium 100k-500k 150, small/unknown 100 (~5% signed x
first-year 5,000 / 3,000 / 2,000 €). `lead start` = 20% of that. The step-2 response is
`{ok:true, value}` and `qed.js` sends that value on the Pixel `lead complete` so the deduped
Pixel/CAPI pair agrees; its fallback and `lead start` use the page default (partners 150).

**walkerOS mapping gotchas (4.3.2).** A rule's `data` must be `{ map: { value: "data.value" } }`;
a bare `{ value: "data.value" }` is a static value and resolves to the literal string (every
conversion went out without a value until Sep 2026). CAPI reads value/currency from
`custom_data`. Web destinations need `loadScript: true` or fbevents.js / gtag.js never load,
and the gtag destination only fires an Ads conversion when the rule has a `name`. Once
fbevents.js loads, Meta's automatic configuration would send button clicks and page metadata
outside the allowlist, so `walker.entry` queues `fbq('set','autoConfig',false,id)` ahead of the
destination's `fbq('init')` (it installs the fbq stub itself; the destination reuses it).

**Consent.** `shared/consent.js` no longer loads any SDK — it records the choice and dispatches
`qed:consentchange`; `walker.entry` pushes `elb('walker consent', …)`. Destinations declare the
category they need: **analytics** → Amplitude; **marketing** → Meta Pixel/CAPI + Google Ads gtag
(and gates the ad-match identity). Nothing fires before consent. The first-visit banner is held
back while a lead form is in view or focused (it used to cover step 1's Continue on phones) and
opens once the form is scrolled away, focus leaves it, or a lead is sent (`qed:leadsent`); while
open it reserves its height as body padding. Only sections that contain a `form[data-action]`
count (the hub's `#plan` is link cards). Lead POSTs sent before a choice carry `_consent:
"denied"` and the server drops their event, so `qed.js` keeps them in memory and re-POSTs them
with `_replay:"consent"` when analytics is granted; the functions answer a replay with
`sendLeadEvent` alone (same `_event_id`, so Meta and Amplitude dedup it).

**Server (`netlify/lib/forms.ts` → `sendLeadEvent`).** The money events (`lead start` step 1 /
`lead complete` step 2 — two distinct names so a "Lead" conversion can't include abandoners) go
through a walkerOS server collector to **Meta CAPI** (`@walkeros/server-destination-meta`) and
**Amplitude EU** (`@walkeros/server-destination-api`). (Google Ads is client-side gtag, not here.)
Ad-blocker-resistant, and the only place server PII is hashed. **PII lives only in the walker `user`
object, never in event `data`** — the Meta `user_data` map reads it (Meta hashes em/ph/fn/ln);
Amplitude's transform reads data+globals+device only, so a lead's email/phone never reaches
Amplitude. City is normalized to a slug on the event; the raw string stays in Telegram + Brevo.
Consent-gated: analytics to send at all, marketing to attach identity. GA4 is dropped.

**Env vars per brand's Netlify site (all inert until set):** client ids in `config.js` (build.mjs) —
`META_PIXEL_ID`, `AMPLITUDE_API_KEY`, and for Google Ads `GOOGLE_ADS_CONVERSION_ID` (`AW-XXXX`) +
`GOOGLE_ADS_LABEL_COMPLETE` + `GOOGLE_ADS_LABEL_START`. Server secrets read at function runtime:
`META_CAPI_TOKEN` (+ `META_TEST_EVENT_CODE` for CAPI smoke tests — while set, Meta events go to
Test Events only). `AMPLITUDE_API_KEY` is used both client (config.js) and server. Google Ads needs
no secrets (client gtag; enable "enhanced conversions for leads → Google tag method" in the Google
Ads UI). (Leftover `PUBLIC_AMPLITUDE_API_KEY` / `PUBLIC_RUDDERSTACK_WRITE_KEY` are unused — safe to
delete.)

## CRM (Brevo)

The three lead functions (`book-event`, `venue-apply`, `franchise-apply`) upsert the lead
into Brevo as a contact via `sendToBrevo` (`netlify/lib/forms.ts`), alongside Telegram and
walkerOS, on the full (step 2) submission. Failures are logged and non-blocking, same as the
walkerOS send — a Brevo outage never breaks the form.

**Step-1 partials** (`sendPartialToBrevo`, plus a one-line "⏳ Started, not finished" Telegram
ping): the contact is upserted with `LEAD_STAGE=partial` (no deal, no confirmation, never the
funnel list, not sent to the portal; optional list via `BREVO_LIST_ID_PARTIAL_<PAGE>` /
`BREVO_LIST_ID_PARTIAL`) and ONE reminder is scheduled 2h out (transactional `scheduledAt`,
template #10 ES / #11 EN by LANG, both branch on `LEAD_SOURCE`). Its batchId is generated by the
client (`qed.js`, sent as `_nudge` on both steps) and stored in `PARTIAL_NUDGE` before scheduling;
step 2 cancels `_nudge` plus any stored `PARTIAL_NUDGE` with `DELETE /v3/smtp/email/{batchId}`
(clearing the attribute only once the cancel succeeds or 404s) and sets `LEAD_STAGE=complete`; a
repeat step 1 cancels the stored one. `qed.js` waits (up to 6 s) for step 1's response before it
posts step 2, so a double Enter can't reach the server out of order, and after an email
correction it re-sends step 1 (same event id) with `_nudgeCancel` for the typo's reminder. No
reminder is scheduled when the same funnel's `LAST_DEAL` is inside the dedupe window. Disclosed by the `form.privacy` line under every
step-1 Continue button. TDT templates (#8, #10) send from hola@brevo.tardeodetrivia.com.

Env vars (set on both Netlify sites, since both brands' leads go to the same Brevo account):
`BREVO_API_KEY` (required), `BREVO_LIST_ID` (default numeric list id) and/or
`BREVO_LIST_ID_<PAGE>` (e.g. `BREVO_LIST_ID_PARTNERS`) to route a funnel to its own list.

Brevo rejects unknown custom attributes, so these must exist in Brevo first (Contacts >
Settings > Contact attributes, type "Text"): `LEAD_CITY`, `LANG`, `LEAD_SOURCE`, `UTM_SOURCE`,
`UTM_CAMPAIGN`, `NOTES`, `LAST_DEAL`, `LEAD_STAGE`, `PARTIAL_NUDGE`. (`FIRSTNAME`/`LASTNAME`/`SMS`
are built in.) Until that setup is done, contacts silently fail to save — check Netlify function logs, not just the form's success state.
City is sent as `LEAD_CITY`, not Brevo's built-in `CITY` — that one is a "Category" enum
(madrid/valencia/murcia/santiago/barcelona) in this account, and the free text this site
collects (e.g. "Santiago de Compostela") 400ed the whole contact against it. Brevo validates
the whole contact payload atomically, so any wrong attribute type (not just a missing one)
fails the entire upsert — `upsertBrevoContact` retries once without whichever attribute
Brevo's error names, so one misconfigured field doesn't lose the whole lead, but its type in
Brevo still needs fixing to actually store that data.

Each lead also creates a Brevo **deal** (`createBrevoDeal`), in this account's one pipeline
("Deals Pipeline", `BREVO_PIPELINE_ID`) and its first stage ("New", `BREVO_STAGE_NEW_ID`) —
both hardcoded ids specific to this Brevo account (update them if the pipeline is ever
rebuilt). `sendToBrevo` GETs the contact by email up front (both to link the deal by id — Brevo
returns the id on contact-create (201) but not on contact-update (204) — and to dedupe
deals: a resubmission of the same funnel within `DEAL_DEDUPE_WINDOW_MS` (30 min, absorbs bot
retries and double-clicks) is skipped, tracked via the contact's `LAST_DEAL` attribute
(`"<page>:<epoch ms>"`, only bumped when a deal is actually created). No monetary `amount` is
set (`leadValue()` is an expected-value bidding weight, not a real deal size) — founders fill
that in once a lead is qualified.

## Caching gotcha

`/shared/*` is served `max-age=86400` (see `netlify.toml`). After adding new `data-i18n` keys,
a returning visitor can briefly see English on the ES site because their browser still holds a
day-old `i18n-common.js` without the new keys, while the HTML revalidates fresh. It self-heals
within a day or on a hard refresh; a fresh visitor is unaffected.

## Deploy

**`git push` to `main` auto-deploys BOTH brands** (each Netlify site builds from this repo/branch
with its own `BRAND`). There is no staging gate — a push is live on both domains within a couple
of minutes. There is no build/test command beyond `node build.mjs`.

To preview locally (static pages plus the Netlify lead-capture functions), run `npm run dev`
(`netlify dev`). It serves the unbranded working tree as-is — no `BRAND`, no About-partial
injection, no SEO tag rewrite — so it won't show per-brand slugs, favicons, or ES-localized
`<title>`/meta tags; use the `git add -A && node build.mjs` workaround above to check those.
