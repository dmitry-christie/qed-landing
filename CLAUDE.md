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
- `/team-events/`: the second corporate page. `/corporate/` is the **booker** page (HR, office or
  events people booking for a company); `/team-events/` is the **organiser** page (someone
  organising it for their own team, who needn't be the company). Same product, form and lead
  funnel, told apart by audience (see "Corporate pages"). Published at the same path on both
  brands.
- `/venues/` — host-venue signup (`venue-apply`)
- `partners/` — franchise (`franchise-apply`). Folder name ≠ URL: published at `/franchise/`
  on QED and `/franquicias/` on TDT (see "Per-brand URL slugs").
- `/privacy/`, `/terms/` — legal

Shared CSS/JS/images live in `/shared/`.

## i18n model (important)

**English is baked into the HTML. Spanish is swapped in at runtime.**

- Each translatable element has `data-i18n="key"` (or `data-i18n-content|ph|aria|href|alt|value`
  for attributes). The baked text is the English. `data-i18n-value` swaps a radio's submitted
  `value`: the corporate event-type cards post their localized label, which Telegram and the
  Brevo deal read, so a missing ES key there would post English from the TDT site.
- Spanish strings live in `shared/i18n-*.js` as `window.QED_ES[key]`. `shared/i18n.js`
  replaces the text when the language is ES.
- Each page loads `i18n-common.js` (shared keys: footer, forms, consent, cross-sell,
  About, and `aud.` for the audience switch and pointer strips of the two corporate pages) plus
  its own `i18n-<page>.js` (page-specific keys, prefixed
  `h.` hub, `c.` corporate, `te.` team events, `cel.` celebrations, `v.` venues, `p.` partners,
  `pr.` privacy, `tm.` terms). `/team-events/` also loads `i18n-corporate.js`, because most of
  its copy is the booker page's `c.*` keys: `c.*` belongs to `/corporate/`, `te.*` to
  `/team-events/`, so tidying `c.*` against `/corporate/` alone breaks `/team-events/` in Spanish
  only.

**When you add or change copy:** edit the baked English in the HTML **and** the matching ES
key in the right i18n file. Every `data-i18n*` key must have a Spanish string, or the ES
site leaks English — a page renders `key` in English if its ES value is missing. After copy
changes, confirm every `data-i18n*` key referenced by a page (after the About partial is
injected) exists in that page's merged `QED_ES` dictionary, which is `i18n-common.js` plus every
page file that page loads. Quickest check: eval those dictionaries into a `window` shim, then
diff against every key in the page **plus `shared/about.partial.html`** on pages with a
`build:about` marker (the partial's keys only appear post-build, so the command adds it) and the
keys of the page's `window.QED_CENA` block, which no attribute names. Arguments: the page folder
(`.` for the hub), then its dictionaries besides common (`/team-events/` takes two):

```bash
CHECK='global.window={};const f=require("fs"),L=p=>new Function("window","Object",f.readFileSync(p,"utf8"))(window,Object);const[pg,...ds]=process.argv.slice(1);["common",...ds].forEach(d=>L(`shared/i18n-${d}.js`));let h=f.readFileSync(`${pg}/index.html`,"utf8");if(h.includes("build:about"))h+=f.readFileSync("shared/about.partial.html","utf8");const u=new Set([...h.matchAll(/data-i18n(?:-(?:content|ph|aria|href|alt|value))?="([^"]+)"/g)].map(m=>m[1]));for(const m of(h.match(/QED_CENA\s*=\s*\{[\s\S]*?\};/)||[""])[0].matchAll(/\["([^"]+)"/g))u.add(m[1]);console.log([...u].filter(k=>!(k in window.QED_ES)))'
node -e "$CHECK" partners partners
node -e "$CHECK" corporate corporate
node -e "$CHECK" team-events corporate team-events
```

Don't judge `/team-events/` against `i18n-common.js` and `i18n-team-events.js` alone: that
reports the reused `c.*` keys as missing, and copying them into `i18n-team-events.js` makes the
orphan check below flag them. The exception is the head: `te.title` and `te.metadesc` must live
in `i18n-team-events.js`, because `localizeHead` reads only `i18n-common.js` plus the page's own
file (a head key in `i18n-corporate.js` ships English on TDT, with no error). The check cannot see
the keys `qed.js` hardcodes (`c.form.phoneReq`, `c.form.phoneErrES`, `form.phoneErr`,
`form.emailErr`), which is why `/team-events/` must load `i18n-corporate.js`.

The reverse, keys left orphaned after a section is rewritten, is a separate check. Judge the
corporate dictionaries against both pages at once, since `c.*` is shared (expect `[]`):

```bash
ORPHANS='global.window={};const f=require("fs"),L=p=>new Function("window","Object",f.readFileSync(p,"utf8"))(window,Object);["common","corporate","team-events"].forEach(d=>L(`shared/i18n-${d}.js`));const used=new Set(["c.form.phoneReq","c.form.phoneErrES"]);for(const p of["corporate","team-events"]){const h=f.readFileSync(`${p}/index.html`,"utf8");for(const m of h.matchAll(/data-i18n(?:-(?:content|ph|aria|href|alt|value))?="([^"]+)"/g))used.add(m[1]);for(const m of(h.match(/QED_CENA\s*=\s*\{[\s\S]*?\};/)||[""])[0].matchAll(/\["([^"]+)"/g))used.add(m[1])}console.log(Object.keys(window.QED_ES).filter(k=>/^(c|te|aud)\./.test(k)&&!used.has(k)))'
node -e "$ORPHANS"
```

Conventions: no em dashes in copy. Localize currency and tax (`€99` / `+ VAT` in English,
`99 €` / `+ IVA` in Spanish). Counters (`data-count`) format via `useGrouping:"always"` so ES
reads `6.700`; the ES default drops the separator on four digits and would disagree with the
printed one-pager.

**ES is the TDT brand, EN is QED, and they don't run in the same places** (TDT has no
Barcelona: 6 locations and 4 event cities in ES, against QED's 7 and 5). So city lists and counts
are facts per language, not translations. ES strings name only TDT cities; for markup that exists
in one language only, use `data-lang-hide="es"` (the element is removed while the page is in ES and
restored on toggle: `<option>`s are detached, since iOS Safari lists a hidden option anyway, and
everything else, SVG included, gets `display:none`). A counter whose value differs gets
`data-count-es="N"` beside `data-count`. Both are handled in `shared/i18n.js` (`applyLangHide`,
`applyCounts`) and `shared/qed.js` (`countTarget`); pages only add the attributes. When TDT opens or
closes a city, update the ES strings, these attributes, and the TDT OG image. The corporate
product is two pages, so on each of `/corporate/` and `/team-events/` that means the hero tag
(`c.hero.tag` / `te.hero.tag` plus the baked English in its `<span>`), the `#venues` list, the
city `<option>`s and the `data-count-es` counter; the drift guard under "Corporate pages" checks
the venues card.

The legal entity differs by brand: baked English names **QED Imperium Ltd** (UK), the ES
strings name **Tardeo de Trivia SL · CIF B88885199**. TDT must show only the Spanish entity —
`foot.legal`, `pr.who.p` (privacy controller) and `tm.who.p` (terms) all have to agree.

**The franchise page publishes no revenue-share percentages and no ad-spend figure.** Each
stream carries a different rate and each steps down with volume, so any single number on the
page is wrong for the others; the page names what is shared and the founders give figures on
the first call. This is a decision, not an omission — don't "fix" it by adding numbers back.
If they ever go up, the transparency line under the block needs its effective date again.

## Shared About section (single source)

The "About us" section is identical on 3 pages (hub, celebrations, partners; the minimal
/venues/ page has none, and /corporate/ and /team-events/ carry a two-line "We know trivia" block
instead), so it is **not** duplicated. It lives once in
`shared/about.partial.html` and is stamped into each page's `<!-- build:about -->` marker by
`build.mjs` on every build. Edit the partial once; every page updates. Its copy is still
translated at runtime via the `about.*` keys in `i18n-common.js`.

## Corporate pages: booker and organiser

One product and one lead funnel on two pages, split by who is reading (Oct 2026). `/corporate/`
is the booker: HR, office or events people booking on behalf of a company. `/team-events/` is the
organiser: someone doing it for their own team, with no company in the way. Price, venues, form
and most copy are shared; the organiser page drops `#what`, `#custom` and `#occasions`, leads with
the group price and keeps a shorter FAQ.

- **Shared CSS.** `shared/corporate.css` holds the `cx-` rules (they used to be inline in
  `corporate/index.html`). Both pages link it directly after `qed.css`, so a `cx-` rule keeps
  winning same-specificity ties. Edit it once; its cache rule is under "Caching gotcha".
- **Switch and strips.** The first child of each hero is `<nav class="cx-aud">`: two sticker
  cards in the page's radio-card language (icon disc, label, marker). The current page is the
  selected card, a non-link `<span aria-current="page">` (yellow, red tick); the other is a plain
  `<a data-aud-link>` (dark, arrow) that lifts like a `.btn` on hover. Always in the order
  [booker, organiser]. Each page also has a `#teaser` strip (`aud.strip.*`) pointing at the other.
  These links must not carry `btn--cta` or `btn--soft` (`qed.js` would file the click as
  `cta click` and return before `crosssell click`) or UTM parameters (they would overwrite the
  stored first touch). It sits inside the hero's old top padding (`--aud-top` + `--aud-h` + the
  margin below it), so the tag, H1 and CTA stay where they were on phones and from 1200 px up
  (measured against the pre-split build); between 701 and about 1100 px they sit up to 15 px lower,
  because the hero padding there (48 to 84 px) is smaller than a 56 px switch. Keep `--aud-h` at
  56px on desktop and 92px on phones, or recompute the margin. The labels fit two lines at 320 px in EN and ES; reword an
  `aud.*` label only after the same check at 320 and 360 px in both languages.
- **Audience preselect (`?for=`).** For ads: `?for=hr` opens `/corporate/` and `?for=team` opens
  `/team-events/`, from either URL (`?audience=` is an alias; `company`, `empresa`, `rrhh`,
  `booker` and `equipo`, `organiser`, `organizer` are accepted values, case-insensitive; anything
  else is ignored). One inline script at the top of each page's `<head>` does a
  `location.replace()` to the other page only when the param names it, keeping the whole query
  string and hash (utm_*, gclid, `v=cena`, `#quote`), so attribution is captured on the
  destination and a matching param cannot loop. The param stays in the URL, so the portal's
  `landing_url` shows which ad URL was used. Examples: `/corporate/?for=team&v=cena&utm_...` and
  `/team-events/?utm_...` are equivalent. The links between the pages carry no `for`.
- **Cena variant (`?v=cena`).** Each page defines `window.QED_CENA = { h1a, h1b, sub, cta }`
  (`[key, English]` pairs) and loads `shared/cena-variant.js` before `i18n.js`, so the English it
  bakes is what `i18n.js` caches and swaps. The script re-points the hero, preselects the dinner
  card and format, and appends `?v=cena` to every `a[data-aud-link]`: `?v` is stored nowhere
  (only `utm_campaign` is), so the variant would be lost on the other page. It also holds the
  `[data-preselect-event]` listener (the organiser's `#easy` card CTA), registered before the
  variant check so it works on every visit.
- **Seasonal ledger.** Christmas copy is marked `SEASONAL` in comments (`grep -rn SEASONAL
  corporate team-events shared`) and most markers appear on both pages. Revert after
  mid-December, the deposit items after 12 Dec: the hero tags (`c.hero.tag`, `te.hero.tag`, each
  with its baked `<span>`); the cena variant (delete `shared/cena-variant.js`, both `QED_CENA`
  blocks and the keys `c.hero.h1cena*`, `c.hero.subcena`, `te.hero.h1cenaa`, `te.hero.subcena`,
  `c.cta.holdcena`; deleting the file also retires the `[data-preselect-event]` listener, so drop
  that attribute from the `#easy` CTA or move the listener into `qed.js` first); the deposit line
  `c.book.3a/3b` and its `<li>`; `c.form.hold` and its `<p>`; the FAQ edits in `c.faq.a6`
  (both pages: revert, un-open, move last, open the price item), `c.faq.a14` (both: the clause
  after the semicolon), `c.faq.a13` (last sentence) and `c.faq.a16` (the parenthesis), both
  booker only; the dinner card listed first; and `te.easy.2` is already the all-year wording ("Pay by card link or bank
  transfer. Split it however you like."), so it needs no revert.
  Brevo confirmations #7/#8 also mention the deposit; they live outside the repo.
- **Reach.** No footer, nav or hub link points at `/team-events/`: it is reached from the switch
  and the strip on `/corporate/`, and from the sitemap. That is a decision, not an omission.
- **Head.** `te.title` and `te.metadesc` own "cena de equipo" and say "de empresa" nowhere,
  because the booker's title owns that phrase and the two near-identical pages should not compete
  for one query. Both pages are canonical to themselves.

Markup both pages share (sprite, proof, why, included, how, ticket, venues card, know-trivia,
form) is duplicated, not partialled, because a build partial doesn't run under `npm run dev`, so
a price, tier or city edit goes into both files. This command compares the two blocks that must
not diverge. Expect `venues card identical`; `price ticket` differs in exactly two places, by
design (`c.ex.1` against `te.ex.1`, and the `c.ex.6` "branded slides" item, absent from
`/team-events/`). It relies on the `<!-- Partner venues` comment staying before the venues card on
both pages:

```bash
node -e 'const f=require("fs");const cut=(p,open,close)=>{const h=f.readFileSync(p,"utf8");const i=h.indexOf(open);const j=h.indexOf(close,i);return h.slice(i,j).replace(/\s+/g," ")};const A="corporate/index.html",B="team-events/index.html";for (const [name,o,c] of [["venues card","<div class=\"card cx-venues reveal\" id=\"venues\">","</section>"],["price ticket","<div class=\"card cx-price reveal\">","<!-- Partner venues"]]) console.log(name, cut(A,o,c)===cut(B,o,c)?"identical":"DIFFERS")'
```

Deliberate choices, not omissions:

- No written quote or forwardable document is promised anywhere. The FAQ promises "a fixed
  price" and a held date; add a quote line only once the founders confirm one is sent.
- The organiser page has no invoice FAQ item: `c.faq.a13` says the invoice is made out to your
  company, against that page's first tick (`te.easy.1`). Re-add a `te.faq.q13` / `a13` pair once a
  person with no company can be told they get one.
- The organiser hero leads with the group price, VAT included, with per head as a worked example:
  a per-head headline is exact only for 25 people at a partner venue (12 pay about €15 there,
  about €20 at their own place). Its fourth fact is "Fixed price", and the `#easy` payment tick says "Pay by card link or
  bank transfer", not "One payment", because of the December deposit.

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

**Adding a page** is a folder plus two edits in `build.mjs`, which must land together: `PAGES`
(source folders) and `I18N_FILE` (folder → `shared/i18n-<name>.js`, which `localizeHead` reads for
TDT). The About-injection and SEO loops `readFileSync` every `PAGES` entry, so an entry without
its `index.html` fails the build for BOTH brands; a folder in `PAGES` with no `I18N_FILE` entry
builds QED and crashes TDT (`ENOENT shared/i18n-undefined.js`), so a push would ship QED and
strand TDT. Land the `build.mjs` edit in the same commit as the folder and its dictionary, never
before, and build BOTH brands to check (a QED-only build passes). Never add attributes to
`<html lang="en">`: TDT's `lang` is replaced by exact string and a miss is silent.

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

`corporate/`, `celebrations/` and `team-events/` have no `BRAND_SLUGS` entry: one slug, the folder
name, on both brands, so they need no `foot.*href` key, no `data-i18n-href` and no 301 map.
`/team-events/` is therefore an English path on the Spanish site. That is a cost decision, not a
limit: the language switcher sends `location.pathname` to the other brand, and a `BRAND_SLUGS`
entry makes the build 301 the other known paths onto each brand's own. A TDT slug would be that
entry plus a `foot.*href`-style key and a `data-i18n-href` on every `data-aud-link` (the switch
and the strip on both pages), changed together.

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

**Both og:images bake the tagline and city list as pixels, not live text.** One script draws
both from its per-brand `BRANDS` table: `python3 shared/make-og-image-tdt.py` (TDT →
`og-image-tdt.png`) and `python3 shared/make-og-image-tdt.py --brand QED` (→ `og-image.png`; the
QED geometry was measured off the original hand-made image, so only the text band changes).
Needs Pillow + `rsvg-convert` (`brew install librsvg`) + HarfBuzz's `hb-shape` (installed with
librsvg; this Pillow has no raqm, so HarfBuzz supplies the tagline's kerning). `--out <path>`
writes elsewhere so you can compare before overwriting, and the first run downloads its two fonts
into `shared/` (gitignored). Regenerate a brand's image whenever:
- one of that brand's cities launches or closes (TDT's list has no Barcelona; QED's is
  company-wide, in the order of the EN `h.foot.tagline`),
- its tagline changes (`h.foot.tagline`: the ES string for TDT, the baked EN in `index.html` for
  QED; keep the brand's `tagline` in the script in sync),
- its logo changes (`shared/tardeo-logo.svg` / `shared/qed-logo.png`).

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

**Client (`shared/walker.js`, loaded on all 8 pages before `consent.js`).** The browser source
auto-fires `page view`; `shared/qed.js` fires engagement (Tier 2/3: `cta click`, `form view`,
`crosssell click`, `faq open`, `scroll reach`, `nav click`, `outbound click`) and the browser
Pixel `lead complete` (id = the submission's `_event_id`, so it dedups against the server CAPI
Lead). Every event carries globals (`brand`/`site`/`section`/`product`/`language`/`env`) and a
`user` seeded from the durable `qed-eid`. Client destinations: **Amplitude** (via the API
destination → EU HTTP V2; ignores the lead events, which are sent server-side), the **Meta Pixel**
(allowlist: only PageView + Lead), and **Google Ads** (gtag, allowlist: only the lead conversions,
with **enhanced conversions for leads** — email + name + city read from the marketing-gated lead
event `data` and hashed by gtag). `qed.js` fires `lead start` client-side too (Google secondary
conversion; the Pixel and Amplitude both ignore it). `crosssell click` carries `to`, `placement`
(`hero` inside the hero, else the nearest enclosing id, e.g. `teaser`), `href` and `label`. The
`FUNNEL_HREF` regex in `qed.js` decides which links count, so a new funnel path must be added
there: a plain link to a path it doesn't list is measured as nothing.

**Lead value** (`leadValue(page, city)` in `forms.ts`, EUR per completed lead = typical deal x
assumed close rate; assumptions, recalibrate from real Brevo close rates): corporate 40 (both
corporate pages; ~270 € x ~12-15% paid close), celebrations 30 (~150 € x ~20%), both cut in Oct
2026 for the cenas push and due a recalibration after 20 ad leads; venues 50 (placeholder),
partners by city population tier: large ≥500k 250, medium 100k-500k 150, small/unknown 100
(~5% signed x first-year 5,000 / 3,000 / 2,000 €). `lead start` = 20% of that. The step-2 response is
`{ok:true, value}` and `qed.js` sends that value on the Pixel `lead complete` so the deduped
Pixel/CAPI pair agrees; its fallback and `lead start` use the page default (partners 150).
Corporate gets its value from the step-1 response instead (see Contact-first below).

**Contact-first corporate form (Oct 2026).** `<form data-contact-first>` (both corporate pages;
celebrations keeps the classic flow) makes step 1 (event type, first name, phone, email; phone
required and checked by `isPhone()`, Spain = 9 digits starting 6-9) the whole lead. The event
type is four one-tap radio cards in `fieldset#c-event`, not a dropdown: a tap moves focus to the
first empty contact field, Enter or Space picks a card, and the error hint sits on the fieldset. `qed.js`
posts it with `_capture:"contact"`, `_variant` and event id E1, waits up to 2.5 s, then shows
the optional step 2; `book-event` answers `{ok, value, tgRef}` after a "📞 LLAMAR" Telegram
alert (call-by time in Europe/Madrid, skipping weekends and the `NO_CALL_DAYS` holidays in
`forms.ts`, which need extending every year (`node scripts/callby.test.mjs` checks it), to
`TELEGRAM_CALL_CHAT_ID` if set, mentioning
`TELEGRAM_CALL_MENTION_ES` / `_EN`), the walkerOS `lead complete` (data `step: 1`), Brevo at
`LEAD_STAGE=contact` with list, deal and template #7/#8 but no reminder, and the portal with
`_e1`. The browser Pixel `lead complete` fires on that response under E1; there is no `lead
start`. Step 2 posts `_step:2` + `_e1` + `_tgRef` and only enriches: a "➕ Detalles" reply to
the alert, Brevo attributes via `enrichBrevo` (never a deal or an email), `lead details` to
Amplitude, the portal row. Skip posts nothing (client `lead skip`, Amplitude only). Edit goes
back to step 1 and re-posts only if the phone or email changed (`_correction:"1"`, same E1,
`_prevEmail`): a "✏️" reply, the contact and confirmation under the new address, no new deal.
Consent replays map step 1 → `lead complete`, step 2 → `lead details`. A post without
`_capture` takes the classic path. The organiser form relabels the cards (`te.form.et*`) but
posts the same four labels through `data-i18n-value`: the portal decodes `eventType` by exact
EN/ES label (an unknown one becomes null) and the server requires it, so don't "improve" them or
drop a card. The step-2 format select keeps an empty first option, because `collect()` snapshots
the whole form and without it step 1 posts the select's default for everyone.

**Two corporate pages, one funnel (Oct 2026).** Both set `window.QED_SITE = "corporate"` and post
`page=corporate`, so section, product, funnel, lead value, Brevo list, templates #7/#8 and the
portal's source are identical by construction. Don't give `/team-events/` its own `QED_SITE` or
`page`: an unknown `page` falls through every per-page map (lead value 50, no Brevo list, no
mapped product). The page says which audience it is in one hidden field, `audience` (`booker` or
`organiser`), which `collect()` posts on every step and consent replay. The server honours only
the exact string `organiser`; anything else on a corporate post, including no field at all (a
page cached from before the split), is `booker` (`audienceOf` in `forms.ts`). It is read in three
places: the Telegram call alert's headline (`Equipo` / `Team` against `Empresa` / `Corporate`),
the `Audience:` item in `metaLine` (Brevo `NOTES` and the deal description are built from the
same text) and the Brevo deal name (suffix ` (equipo)` on a Spanish lead, ` (team)` on an
English one, organiser only); `node scripts/audience.test.mjs` checks all three. Nothing else
reads it: no client global, no Amplitude property, no Brevo attribute, no `walker.js` rebuild.
Amplitude tells the pages apart by `page_path`, which every client and server event carries; the
portal receives the raw field with the rest of the payload and interprets nothing. It records the
page the lead used, not the person. `MEASUREMENT-PLAN.md` section 4 says how to read the two
apart.

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
count (the hub's `#plan` is link cards). A form already on the first screen at load (the
/venues/ hero form, which a short page can never scroll away) holds the banner only while focus
is inside it, so the 4 s timer still opens it there. Lead POSTs sent before a choice carry `_consent:
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
`UTM_CAMPAIGN`, `UTM_CONTENT`, `NOTES`, `LAST_DEAL`, `LEAD_STAGE`, `PARTIAL_NUDGE`.
(`FIRSTNAME`/`LASTNAME`/`SMS`/`OPT_IN` are built in.) `LEAD_STAGE` is `partial`, `contact`
(corporate step 1, which templates #7/#8 branch on for the call-back wording) or `complete`. Until that setup is done, contacts silently fail to save — check Netlify function logs, not just the form's success state.
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

A lead from `/team-events/` is a corporate lead for all of this (list `BREVO_LIST_ID_CORPORATE`,
`LEAD_SOURCE=corporate`, templates #7/#8). The audience shows only as the deal name suffix and as
`Audience:` in `NOTES` and the deal description; there is no `LEAD_AUDIENCE` attribute, so nothing
to create in Brevo.

The portal intake (`sendToPortal`) is inert until `PORTAL_INTAKE_*` is set on a Netlify site and
the portal's intake function v6 is deployed (v5 skips every step-1 post, which on the corporate
form is the whole lead), so until then Telegram is the call queue.

## Caching gotcha

`/shared/*` is served `max-age=86400` (see `netlify.toml`). After adding new `data-i18n` keys,
a returning visitor can briefly see English on the ES site because their browser still holds a
day-old `i18n-common.js` without the new keys, while the HTML revalidates fresh. It self-heals
within a day or on a hard refresh; a fresh visitor is unaffected. When a change must not be
mixed with yesterday's cached file (new HTML needing new JS, like the contact-first form), add a
`?v=YYYYMMDD` to that page's `/shared/` URLs, as corporate, the hub and privacy carry since
`?v=20261008`.

The corporate pair carries `?v=20261013` on `i18n-common.js`, `i18n-corporate.js` and `qed.js`
(the split edited all three; use one value on both pages, higher than any already there). The
three files the split added, `corporate.css`, `cena-variant.js` and `i18n-team-events.js`, are
plain URLs: a file that didn't exist yesterday has no stale copy. That leaves `corporate.css` as
the catch. It used to be inline, so a CSS fix was atomic with the HTML; as a `/shared/` file a
CSS-only edit reaches returning visitors up to a day late unless a `?v=` is added or bumped on
its link on `/corporate/` AND `/team-events/` together. `cena-variant.js` is the same.

The same window applies to corrected facts and new mechanisms: for up to a day a returning visitor
can run new HTML against yesterday's `i18n-*.js` / `i18n.js` / `qed.js` (e.g. the TDT city lists
still naming Barcelona, `data-lang-hide` ignored). Don't hand-add `?v=` queries to fix it: the
pending hashed-asset build rewrites the exact string `"/shared/<file>.js"`, so a versioned URL
would slip past it and 404. That parked build (branch `build-dist-refactor`) also hard-codes its
page list (`SRC_PAGES`) and hashed-asset list (`assetsToHash`): before it is revived it must gain
`team-events/`, `i18n-team-events.js`, `corporate.css` and `cena-variant.js`, and cope with `?v=`
suffixes, or `/team-events/` 404s on both brands and both hero switches become dead links.

## Deploy

**`git push` to `main` auto-deploys BOTH brands** (each Netlify site builds from this repo/branch
with its own `BRAND`). There is no staging gate — a push is live on both domains within a couple
of minutes. There is no build/test command beyond `node build.mjs`.

To preview locally (static pages plus the Netlify lead-capture functions), run `npm run dev`
(`netlify dev`). It serves the unbranded working tree as-is — no `BRAND`, no About-partial
injection, no SEO tag rewrite — so it won't show per-brand slugs, favicons, or ES-localized
`<title>`/meta tags; use the `git add -A && node build.mjs` workaround above to check those.
