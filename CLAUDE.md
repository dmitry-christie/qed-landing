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
- Branded builds: injects canonical/hreflang/OG SEO tags at `<!-- build:seo -->` and sets
  `<html lang>`.
- When the `RUDDERSTACK_*` env vars are set: injects the analytics snippet at
  `<!-- build:analytics -->`.

Committed source keeps the markers; the build fills them. To run locally without dirtying the
tree: `git add -A`, `node build.mjs`, inspect, then `git checkout -- .` to restore the markers.

## Analytics

Consent-gated RudderStack (`shared/consent.js`). Nothing loads until the visitor grants
Analytics consent, and never on `*.netlify.app` previews. The page view (`rudderanalytics.page()`)
carries `page_type: "landing"`, `section` (`window.QED_SITE`; hub = `"home"`), and `language`.
Forms fire `Form Submitted` at step 1 and step 2.

## Caching gotcha

`/shared/*` is served `max-age=86400` (see `netlify.toml`). After adding new `data-i18n` keys,
a returning visitor can briefly see English on the ES site because their browser still holds a
day-old `i18n-common.js` without the new keys, while the HTML revalidates fresh. It self-heals
within a day or on a hard refresh; a fresh visitor is unaffected.

## Deploy

**`git push` to `main` auto-deploys BOTH brands** (each Netlify site builds from this repo/branch
with its own `BRAND`). There is no staging gate — a push is live on both domains within a couple
of minutes. There is no build/test command beyond `node build.mjs`.
