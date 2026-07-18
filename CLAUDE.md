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
- `/partners/` — franchise (`franchise-apply`)
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
injected) exists in that page's merged `QED_ES` dictionary.

Conventions: no em dashes in copy. Localize currency and tax (`€99` / `+ VAT` in English,
`99 €` / `+ IVA` in Spanish).

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
- When the `RUDDERSTACK_*` env vars are set: injects the analytics snippet at
  `<!-- build:analytics -->`.

Committed source keeps the markers; the build fills them. To run locally without dirtying the
tree: `git add -A`, `node build.mjs`, inspect, then `git checkout -- .` to restore the markers.

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

## Analytics

Consent-gated RudderStack (`shared/consent.js`). Nothing loads until the visitor grants
Analytics consent, and never on `*.netlify.app` previews. The page view (`rudderanalytics.page()`)
carries `page_type: "landing"`, `section` (`window.QED_SITE`; hub = `"home"`), and `language`.
Forms fire `Form Submitted` at step 1 and step 2.

## CRM (Brevo)

The three lead functions (`book-event`, `venue-apply`, `franchise-apply`) upsert the lead
into Brevo as a contact via `sendToBrevo` (`netlify/lib/forms.ts`), alongside Telegram and
RudderStack. Only fires on the full (step 2) submission, not the step-1 partial. Failures are
logged and non-blocking, same as RudderStack — a Brevo outage never breaks the form.

Env vars (set on both Netlify sites, since both brands' leads go to the same Brevo account):
`BREVO_API_KEY` (required), `BREVO_LIST_ID` (default numeric list id) and/or
`BREVO_LIST_ID_<PAGE>` (e.g. `BREVO_LIST_ID_PARTNERS`) to route a funnel to its own list.

Brevo rejects unknown custom attributes, so these must exist in Brevo first (Contacts >
Settings > Contact attributes, type "Text"): `LEAD_CITY`, `LANG`, `LEAD_SOURCE`, `UTM_SOURCE`,
`UTM_CAMPAIGN`, `NOTES`, `LAST_DEAL`. (`FIRSTNAME`/`LASTNAME`/`SMS` are built in.) Until that setup is done,
contacts silently fail to save — check Netlify function logs, not just the form's success state.
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
set (the `LEAD_VALUE` map above is a relative ad-bidding weight, not a real deal size) —
founders fill that in once a lead is qualified.

## Caching gotcha

`/shared/*` is served `max-age=86400` (see `netlify.toml`). After adding new `data-i18n` keys,
a returning visitor can briefly see English on the ES site because their browser still holds a
day-old `i18n-common.js` without the new keys, while the HTML revalidates fresh. It self-heals
within a day or on a hard refresh; a fresh visitor is unaffected.

## Deploy

**`git push` to `main` auto-deploys BOTH brands** (each Netlify site builds from this repo/branch
with its own `BRAND`). There is no staging gate — a push is live on both domains within a couple
of minutes. There is no build/test command beyond `node build.mjs`.
