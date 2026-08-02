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
Analytics (Segment) is not build-time config — `shared/consent.js` hardcodes the write key
and loads the SDK client-side once consent is granted, the same way on every build.

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

## Analytics

Consent-gated Segment (`shared/consent.js`, official `analytics.js` v1 snippet, write key
hardcoded client-side like a GA measurement id — same key used server-side in
`netlify/lib/forms.ts`). Nothing loads until the visitor grants Analytics consent, and never
on `*.netlify.app` previews. The page view (`analytics.page()`) carries `page_type: "landing"`,
`section` (`window.QED_SITE`; hub = `"home"`), and `language`. Forms fire two distinct event
names — `Lead Started` at step 1, `Form Submitted` at step 2 — rather than one name split by
a `step` property, so a Lead conversion mapped to `Form Submitted` in Google Ads / Meta can't
accidentally include abandoners. Sent server-side via Segment's HTTP Tracking API
(`sendToSegment`) — not the client SDK, so it isn't blocked by an ad blocker and still fires
on the fire-and-forget step-1 partial. Segment fans events out to Meta Conversions API / Google Ads / GA4 via
destinations configured once in the Segment dashboard.

## CRM (Brevo)

The three lead functions (`book-event`, `venue-apply`, `franchise-apply`) upsert the lead
into Brevo as a contact via `sendToBrevo` (`netlify/lib/forms.ts`), alongside Telegram and
Segment. Only fires on the full (step 2) submission, not the step-1 partial. Failures are
logged and non-blocking, same as Segment — a Brevo outage never breaks the form.

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
