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
  `/corporate/` serves both the booker (HR, office or events people booking for a company) and the
  organiser (someone organising it for their own team), with a VAT switch on the price (see
  "Corporate page"). `/team-events/` is gone: `netlify.toml` 301s it to `/corporate/`.
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
  About) plus its own `i18n-<page>.js` (page-specific keys, prefixed
  `h.` hub, `c.` corporate, `cel.` celebrations, `v.` venues, `p.` partners,
  `pr.` privacy, `tm.` terms).

**When you add or change copy:** edit the baked English in the HTML **and** the matching ES
key in the right i18n file. Every `data-i18n*` key must have a Spanish string, or the ES
site leaks English — a page renders `key` in English if its ES value is missing. After copy
changes, confirm every `data-i18n*` key referenced by a page (after the About partial is
injected) exists in that page's merged `QED_ES` dictionary, which is `i18n-common.js` plus every
page file that page loads. Quickest check: eval those dictionaries into a `window` shim, then
diff against every key in the page **plus `shared/about.partial.html`** on pages with a
`build:about` marker (the partial's keys only appear post-build, so the command adds it) and the
keys of the page's `window.QED_CENA` block, which no attribute names. Arguments: the page folder
(`.` for the hub), then its dictionaries besides common:

```bash
CHECK='global.window={};const f=require("fs"),L=p=>new Function("window","Object",f.readFileSync(p,"utf8"))(window,Object);const[pg,...ds]=process.argv.slice(1);["common",...ds].forEach(d=>L(`shared/i18n-${d}.js`));let h=f.readFileSync(`${pg}/index.html`,"utf8");if(h.includes("build:about"))h+=f.readFileSync("shared/about.partial.html","utf8");const u=new Set([...h.matchAll(/data-i18n(?:-(?:content|ph|aria|href|alt|value))?="([^"]+)"/g)].map(m=>m[1]));for(const m of(h.match(/QED_CENA\s*=\s*\{[\s\S]*?\};/)||[""])[0].matchAll(/\["([^"]+)"/g))u.add(m[1]);console.log([...u].filter(k=>!(k in window.QED_ES)))'
node -e "$CHECK" partners partners
node -e "$CHECK" corporate corporate
```

`localizeHead` reads only `i18n-common.js` plus the page's own file, so a head key must live in
one of those two. The check cannot see the keys `qed.js` hardcodes (`c.form.phoneReq`,
`c.form.phoneErrES`, `form.phoneErr`, `form.emailErr`).

The reverse, keys left orphaned after a section is rewritten, is a separate check. It judges the
corporate dictionary against `corporate/index.html` (expect `[]`):

```bash
ORPHANS='global.window={};const f=require("fs"),L=p=>new Function("window","Object",f.readFileSync(p,"utf8"))(window,Object);["common","corporate"].forEach(d=>L(`shared/i18n-${d}.js`));const used=new Set(["c.form.phoneReq","c.form.phoneErrES"]);const h=f.readFileSync("corporate/index.html","utf8");for(const m of h.matchAll(/data-i18n(?:-(?:content|ph|aria|href|alt|value))?="([^"]+)"/g))used.add(m[1]);for(const m of(h.match(/QED_CENA\s*=\s*\{[\s\S]*?\};/)||[""])[0].matchAll(/\["([^"]+)"/g))used.add(m[1]);console.log(Object.keys(window.QED_ES).filter(k=>/^c\./.test(k)&&!used.has(k)))'
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
closes a city, update the ES strings, these attributes, and the TDT OG image. On `/corporate/`
that means the hero tag (`c.hero.tag` plus the baked English in its `<span>`), the `#venues` list,
the city `<option>`s and the `data-count-es` counter.

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
/venues/ page has none, and /corporate/ carries a two-line "We know trivia" block
instead), so it is **not** duplicated. It lives once in
`shared/about.partial.html` and is stamped into each page's `<!-- build:about -->` marker by
`build.mjs` on every build. Edit the partial once; every page updates. Its copy is still
translated at runtime via the `about.*` keys in `i18n-common.js`.

## Corporate page: booker and organiser

One product, one page and one lead funnel for two readers: the booker (HR, office or events people
booking on behalf of a company) and the organiser (someone doing it for their own team, with no
company in the way). The organiser had its own page, `/team-events/`, from Oct 2026; it was merged
back into `/corporate/` on 18 Oct 2026, because its searches were about a tenth of the company ones
and it differed mainly in showing prices with VAT included. `netlify.toml` 301s `/team-events` and
`/team-events/*` to `/corporate/` (Netlify keeps the query string, the browser keeps the hash), so
old links and ads keep working. `shared/cena-variant.js` and `shared/qed.js` still mention
`/team-events/` in comments and `FUNNEL_HREF` still lists it: harmless, left on purpose.

- **Shared CSS.** `shared/corporate.css` holds the `cx-` rules (they used to be inline in
  `corporate/index.html`). `/corporate/` links it directly after `qed.css`, so a `cx-` rule keeps
  winning same-specificity ties. Edit it once; its cache rule is under "Caching gotcha".
  `/celebrations/` links it too, for the price ticket only (`.cx-price`, `.cx-tiers`, `.cx-band`:
  every private event has the same prices and extras, shown there with VAT included). So an edit
  to those rules changes both pages, and a `?v=` bump on `corporate.css` goes on both.
- **VAT switch.** `#price` has a Sin IVA / Con IVA switch (`.cx-vat`: two buttons with
  `data-vat-set="ex"` / `"inc"` and `aria-pressed`, keys `c.vat.*`). Every price that changes is a
  pair of spans, `.vat-ex` and `.vat-inc` (the hook, the ticket, the tiers, the partner-venue
  saving, the venues stamp and the per-head lead; keys `c.price.*.inc`, `c.price.i181` / `i242` /
  `i302` / `i363`, `c.ven.save.inc`), and `html[data-vat="inc"]` shows the second (rules at the end
  of `shared/corporate.css`). A new price on the page needs both spans and both ES keys. The head
  script sets `data-vat` before first paint, so prices never flash: on for `?for=` `team`,
  `equipo`, `organiser` or `organizer`; forced off, ignoring a stored choice, for `hr`, `company`,
  `empresa`, `rrhh` or `booker` (`?audience=` is an alias, case-insensitive; anything else is
  ignored); otherwise the visitor's last choice (`localStorage` `qed-vat`); else off. There is no
  redirect, and the param stays in the URL, so the portal's `landing_url` shows which ad URL was
  used. An inline script before `cena-variant.js` handles a click on any `[data-vat-set]`, stores
  the choice and sets the form's hidden `audience` to `organiser` while VAT is on, `booker`
  otherwise (see "One corporate page, two audiences" under Analytics).
- **Pointer strip.** The page has one strip, `<section id="teaser">`, directly under the hero: the
  first section after the hero's closing `</section>`. It speaks to the organiser: a `cx-pointer`
  card holds a bold line, one sentence and a link (`c.org.t`, `c.org.d`, `c.org.cta`). The link is
  `<a class="cx-pointer__link" href="#price" data-vat-set="inc">`: it turns VAT on and jumps to the
  prices. Until 18 Oct 2026 it pointed at `/team-events/`, and before that the hero opened with a
  two-card audience switch (removed in Oct 2026, the founder's call), so there is no `cx-aud`
  markup, CSS or `aud.*` key left. It must not carry `btn--cta` or `btn--soft` (`qed.js` would file
  the click as `cta click`). Its click fires no event (`#price` is not a funnel path for
  `FUNNEL_HREF`); the lead's `audience` is the signal. It is a slim band under a dark hero, not a
  content section, so `shared/corporate.css` sets `#teaser{padding-bottom:0}`: the card then sits
  as far from the next heading as from the hero edge, where `section--tight`'s bottom padding as
  well would double that gap. The link has a tap target of 44px at every width (its 24px line plus
  10px of padding above and below, with a matching negative margin: the card keeps its
  height; a reading of 43.1px is the card still in `.reveal`'s start state, `scale(.98)`) and
  `scroll-margin-top:84px`, which keeps a keyboard focus scroll from parking it behind the 68px
  sticky header; where the phone sticky bar can show (up to 560 px wide, 401px high or more) it
  also has `scroll-margin-bottom` of 84px plus the safe-area inset: without it Tab from "See
  prices" parks the link flush with the bottom edge on viewports from about 460 to 620px high,
  where the bar, which comes on a few px of scroll later once the CTA leaves, covers it. On a phone
  the strip starts below the first screen (705 px and lower at 375x667), so it never competes with
  the hero CTA, and the sticky bar waits for its card to clear the bar's zone (see "Phone pass").
  That wait and the margin guard the same hazard: either one alone keeps the bar off the link.
  The hero's two links, the CTA and "See prices", carry the same `scroll-margin-top:84px`
  (`.cx-hero a`): Shift+Tab from the strip reaches them first, neither has an id for qed.css's
  `[id]` margin to catch, and without it "See prices" can land behind the nav.
- **Cena variant (`?v=cena`).** The page defines `window.QED_CENA = { h1a, h1b, sub, cta }`
  (`[key, English]` pairs) and loads `shared/cena-variant.js` before `i18n.js`, so the English it
  bakes is what `i18n.js` caches and swaps. The script re-points the hero (and the phone sticky
  bar's label, `#c-sticky-cta`, with the hero's) and preselects the dinner card and format. It also
  appends `?v=cena` to any `a[data-aud-link]` and holds a `[data-preselect-event]` listener; since
  the merge nothing on the page carries either attribute, so both do nothing.
- **Seasonal ledger.** Christmas copy is marked `SEASONAL` in comments (`grep -rn SEASONAL
  corporate shared`). Revert after mid-December, the deposit items after 12 Dec: the hero tag
  (`c.hero.tag`, with its baked `<span>`); the cena variant (delete `shared/cena-variant.js`, the
  `QED_CENA` block and the keys `c.hero.h1cena*`, `c.hero.subcena`, `c.cta.holdcena`; it retires the
  phone sticky bar's label swap (`#c-sticky-cta`) too, and the bar then keeps `c.cta.tell`, the
  all-year wording, with no edit); the deposit line `c.book.3a/3b` and its `<li>`; the hold-date
  line `c.form.hold`, in two `<p>`s: the `.quote-intro__more` line above the form and the
  phone-only `.cx-form__hold` under Continue; the FAQ edits in `c.faq.a6` (revert, un-open, move
  last, open the price item), `c.faq.a14` (the clause after the semicolon), `c.faq.a13` (last
  sentence) and `c.faq.a16` (the parenthesis); the dinner card listed first.
  Brevo confirmations #7/#8 also mention the deposit; they live outside the repo.
- **Phone pass (Oct 2026).** Phone rules for `/corporate/`, one item each. The breakpoint is
  `max-width:560px` unless named. The banner, dial-code and step 2 rules are in `shared/qed.css`, so
  they reach all seven pages; each is scoped to `.consent`, `[data-contact-first]`, `.form-step2` or
  `.form-success`.
  - Hero (`corporate.css`, one `max-width:560px` block after the 700px one, which it overrides): a
    tight stack under the nav, the tag 12px below it, then the H1 and sub, then the CTA full width
    and ahead of the fact chips and the price line by visual `order` only (the chips are not
    focusable, so DOM order, keyboard order and the `cta click` placement are unchanged). The CTA
    top sits at 377 to 424 px and its bottom at 437 to 484 px on a 375x667 screen in every brand
    and `?v=cena` combination (measured across eight combinations while `/team-events/` was a
    second page; 593 to 640 and 653 to 700 before the pass); the bottoms
    are 468 to 516 at 320x568, 445 to 476 at 360x740, 442 to 489 at 390x844 and 433 to 498 at
    412x915, so the CTA is inside the screen in every combination, and the pointer strip starts
    below the first screen (705 to 801 px at 375x667). The photo is a short 8:6 backdrop
    (`hero-host-800-s.webp`, exactly that ratio) whose box is pulled 70px above the hero
    (`inset:-70px 0 auto 0`; the hero clips it), so the tag starts 82px down the box and the copy
    lies further down the gradient than the box's own top would put it: do not set the inset back to
    0. The gradient stops are the box's own percentages (30%, 52% and 85% of its height) up to 412 px
    wide and stay where they are at 412 from 413 px up (`min(100vw,412px)`), because the copy does
    not move with the width; the declaration before it is the same gradient in plain percentages,
    the fallback for a browser without `min()`. Legibility, measured on the worst pixel of each text
    box (the brightest photo pixel anywhere in a text line's box, text shadow off) from 320 to 560
    px wide, EN and ES, plain and `?v=cena`: the H1's white 5.5:1 or better up to 412 px and 4.7:1
    or better up to 560 px (AA for large text is 3:1; the 4.5:1 of body text is cleared too) and its
    yellow accent 5.2:1 or better, and the sub, the chips, the call-back line and the price line sit
    on solid ink (14.7:1, 17.2:1, 13.5:1 and 12.4:1 or better; AA is 4.5:1). Re-measure after
    touching the gradient, the photo or the inset. From 561 px up the pass changes no hero rule:
    561 to 700 px keeps the 8:9 crop and its lighter gradient with the copy below the photo, and
    from 701 px the photo covers the section.
  - Hero photo files: up to 560 px `hero-host-800-s.webp` (800x600: rows 400 to 1000 of
    the 800x1000 `hero-host-800`, which is what the 8:6 box shows at `object-position:center
    bottom`, less the top 70px of the box that the hero clips: the hero shows rows 500 to 1000 of
    `hero-host-800` at 560 px wide, 549 to 1000 at 375 and 575 to 1000 at 320); 561 to 700 px
    `hero-host-800-c.webp` (800x900: rows 100 to 1000, the 8:9 box never showed the top 100);
    `hero-host-800.jpg` (800x1000) at 700 px and below where WebP is missing;
    from 701 px `hero-host-1200` / `-1920`. The `-s` and `-c` names are new on purpose (no stale
    cache). The hub still uses `hero-host-800.webp` / `.jpg`, at 640 px and with another crop: never
    overwrite them.
    The two small proof photos are `corp-photo-smiles-360.webp` and `corp-photo-crowd-360.webp`
    (360x270), the 360w candidate beside the 720 files, with `sizes="(max-width:700px) calc(50vw -
    28px), 360px"`; the teams photo keeps its one 720 file.
  - Consent banner (`qed.css`, all seven pages): 8px margins, 11.5px message, two equal 40px
    buttons, "Manage" with a 32px hit area. It is 128px high at 375 and 390 px wide; at 320 to 360
    it is 128 to 160px (the ES text is the tall one). `consent.js` is unchanged, timing included
    (4 s, or 250 ms after the first scroll settles): holding it longer when it would cover the hero
    CTA was left out, because it changes how many visitors are ever asked, which is a measurement
    decision.
  - Arriving at the form (`#quote`, up to 767 px): a slimmer intro panel with `.cx-quote__sub`
    hidden (its date, city and headcount are optional step 2 fields) and `scroll-margin-top:68px`,
    so a jump puts the first name on screen at about y 410 to 450 on a 375x667 screen (Continue is a
    short scroll away there, and fully on screen from about 812px tall). While the banner is open,
    `html:has(body > .consent) #quote` scrolls the form 0 to 134px further (950px less the dynamic
    viewport height, capped) so Continue clears the banner at 812px tall and above; only the scroll
    target moves, nothing is hidden. The shortest phones (375x667, 360x740) cannot clear it whatever
    the margin. The event cards are tighter up to 520 px.
  - Under Continue (up to 767 px): `.cx-form__call` (reuses `c.hero.call`) and the SEASONAL
    `.cx-form__hold` (reuses `c.form.hold`), because the `.quote-intro__more` lines
    above the form are hidden below 768 px. Both are `display:none` from 768 px.
  - Enter and the keyboard's "next" key (`initContactFirst()` in `qed.js`): on the first name and
    the phone, Enter checks only the field being left (an invalid one keeps focus and shows its own
    error) and otherwise moves focus to the phone or the email, instead of submitting and flagging
    every empty field. On the email, and when name, phone and email are all valid, Enter goes
    through to Continue as before. Android's "next" is a Tab, so on a touch device up to 767 px the
    dial-code button is out of the Tab order (`tabindex="-1"`; a tap still opens it, and Shift+Tab
    from the number steps back onto it), or "next" from the name would land on it and drop the
    keyboard.
  - Dial code on one row (`[data-contact-first]` only, from `qed.css` and `buildCustomSelect()` in
    `qed.js`): the closed button shows "+34" in a 94px box (a four-digit code such as "+1242" shows
    whole) and the number sits beside it. The open list and the native `<select>` keep "Spain +34",
    and `data-dial` and the submitted value are unchanged. The label and the layout use the same
    `max-width:560px` query; /celebrations/, /venues/ and /partners/ keep the long label on its own
    row.
  - 44px targets on the path: step 2 "Wrong phone or email? Fix it" and "Skip" (up to 767 px,
    `[data-contact-first]`), the sticky bar's button, the hero's "See prices" link (padding with a
    matching negative margin, so its layout is unchanged) and the pointer strip's link (44px, see
    "Pointer strip"). The headings `qed.js` focuses programmatically (`.form-step2 h3`,
    `.form-success`) show no focus ring.
  - The header steps aside (up to 860 px): `html.is-typing .nav{ position:static }` while a text
    field of `#event-form` has focus, the form is on screen and the burger menu is closed (its panel
    is positioned against the header). It keeps its slot, so nothing shifts. `is-typing` is set by
    the sticky-bar block in `qed.js`, so removing the `#cx-sticky` markup also switches this off.
  - Sticky CTA bar, `#cx-sticky`: a fixed bottom bar, 58px high, repeating the hero CTA
    (`c.cta.tell`, to `#quote`). Markup after `</footer>`, rules at the end of
    `shared/corporate.css`, logic in `shared/qed.js` after `initEngagement()`, in a try/catch so it
    cannot break the scripts after it. It is on once the hero CTA has scrolled off the top and none
    of these holds: `#quote` or the footer is on screen; a lead was sent on this page view
    (`qed:leadsent`); the cookie banner is open or due (consent undecided on a production host, so a
    first-time visitor sees the bar only after answering); the pointer strip's card
    (`#teaser .cx-pointer`) is in the bar's zone, the bottom bar-height of the viewport (58px, or
    74px beside the WhatsApp button, below): its lower edge is below the bar's top edge with its top
    still on screen. That happens on a short phone only: at 320x568 and 375x553 the card can
    still be low when the CTA leaves and the bar would cover its link, so the bar waits until the
    card has cleared, up to about 70px of scroll (about 85px with the 74px bar); from 360x640 up
    there is no wait (measured with the strip's earlier, shorter text; its organiser sentence is
    longer now, so re-measure before relying on these numbers). The script measures the card once per animation frame while the CTA is gone
    (on scroll, resize and the card's `transitionend`, since its reveal moves it) and looks it up
    once, by that selector: rename the strip's class or id and the rule switches off silently, and
    the bar goes back to coming on as soon as the CTA leaves. Its taps are `cta click` with
    `placement` `cx-sticky` (MEASUREMENT-PLAN.md section 4). The same block keeps two `<html>`
    classes: `is-typing` (above) and `has-chat` (set when the page has the `.wa-float` WhatsApp
    button, which sits at the bottom right: the bar then keeps 84px of right padding, its button ends
    14px short of the WhatsApp one at 375 and 320 px wide, and its label can wrap to two lines, 74px
    high, at 320 px). The bar is `display:none`
    at a viewport height of 400px or less (a zoomed desktop window), and while it is on
    `html:has(.cx-sticky.is-on)` sets `scroll-padding-bottom` (80px plus the safe-area inset) so
    keyboard focus is not parked behind it; `consent.js` sets the same property inline while its
    banner is open, and the bar is off then. `shared/cena-variant.js` swaps its label
    (`#c-sticky-cta`) with the hero's. Kill switch: `display:none` on `.cx-sticky` after the phone
    block at the end of `corporate.css` (the base rule is already `display:none`; the 560px block
    turns it on). That leaves `is-typing` working; deleting the `<div>` also switches `is-typing`
    and `has-chat` off.

- **Call or WhatsApp now (Oct 2026).** A `.cx-direct` block (lead line `c.direct.lead`, a `tel:` link
  and a `wa.me` link with a prefilled message, `c.direct.wa` via `data-i18n-href`) for the company
  line, +34 643 380 980, on both brands. Three copies: under the hero CTA, in the `#quote` intro
  (`quote-intro__more`, 768px and up) and under Continue on phones (`.cx-form__direct`), so the intro
  panel keeps its height and the first field still lands where "Arriving at the form" says. The
  hero copy sits below the CTA, so the CTA's measured position is unchanged (375x667: bottom 452 QED,
  463 TDT). `/celebrations/` has the same block under its hero buttons and in the `#plan` intro
  (`cel.direct.*`, inline SVGs: that page has no sprite). Rules in `shared/corporate.css`; links are
  44px targets. Clicks are `contact click` (`method`, `placement`, `first`) from `qed.js`, checked before
  outbound so `wa.me` is not an outbound click. The first tap on each method per page view is also a
  secondary conversion: Meta's standard `Contact` (marketing consent) and, once
  `GOOGLE_ADS_LABEL_CONTACT` is set, a Google Ads conversion (`firstTapOnly` in `walker.entry`). Keep
  both secondary in the ad accounts: a tap is not a lead, and the campaigns bid on `lead complete`. The number appears in five places in the HTML plus the
  two `*.direct.wa` keys per language: change them together. The lead line carries the call hours,
  Mon to Fri 10:00 to 19:00 (ES `L-V, 10-19 h`), the same as `c.form.call`.
- **WhatsApp button, all seven pages (Oct 2026).** `.wa-float`, a fixed 56px green button at the bottom
  right, replaced the Brevo Conversations chat launcher (`shared/brevo.js` is gone; Brevo is still the
  CRM, server-side). It is a plain `wa.me` link to the same number, so it loads nothing and needs no
  consent; the Functional category now only covers the language memory, and the privacy page lists
  WhatsApp under who we share data with (`pr.share.li7`). Each page's prefilled message is its own key:
  `h.wa`, `c.direct.wa`, `cel.direct.wa`, `v.wa`, `p.wa`, `pr.wa`, `tm.wa`. Hidden while the consent
  banner is open and while `html.is-typing` is set. Rules at the end of `shared/qed.css`; clicks are
  `contact click` with `placement` `float`.

Deliberate choices, not omissions:

- No written quote or forwardable document is promised anywhere. The FAQ promises "a fixed
  price" and a held date; add a quote line only once the founders confirm one is sent.

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
  it stays as function-runtime env (see Analytics). Every build trims these values (a pasted
  trailing newline would otherwise land in `config.js`) and prints `[qed build] WARNING:` when
  `GOOGLE_ADS_CONVERSION_ID` is not `AW-` plus six or more digits, or a `GOOGLE_ADS_LABEL_*` is
  not ten or more of letters, digits, `-` and `_` (an `AW-id/label` pasted into one variable, an id
  without `AW-`). It warns and builds on, writing the value as given: Google's tag accepts a wrong
  value and records nothing with no error, so the deploy log is the only place it shows. A
  variable edit changes nothing until a deploy is triggered, because `config.js` is written at
  build time.
- Branded builds also mark the other brand's logo `loading="lazy"` on all seven pages, header and
  footer (`HIDDEN_LOGO`, an exact-string replace): CSS hides it by `html[lang]`, but a
  `display:none` image is still downloaded and a lazy one with no layout box is not, so TDT no
  longer fetches `qed-logo.png` (55 KB) nor QED `tardeo-logo.svg` (10 KB). If a page's logo markup
  changes, the replace matches nothing and says nothing: check a built page for `loading="lazy"`
  on the hidden brand's `<img>`.

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

`corporate/` and `celebrations/` have no `BRAND_SLUGS` entry: one slug, the folder name, on both
brands, so they need no `foot.*href` key, no `data-i18n-href` and no 301 map. The old
`/team-events/` path is not a slug either: `netlify.toml` 301s it to `/corporate/` on both brands.

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

**Client (`shared/walker.js`, loaded on all 7 pages before `consent.js`).** The browser source
auto-fires `page view`; `shared/qed.js` fires engagement (Tier 2/3: `cta click`, `form view`,
`crosssell click`, `faq open`, `scroll reach`, `nav click`, `outbound click`) and the browser
Pixel `lead complete` (id = the submission's `_event_id`, so it dedups against the server CAPI
Lead). Every event carries globals (`brand`/`site`/`section`/`product`/`language`/`env`) and a
`user` seeded from the durable `qed-eid`. Client destinations: **Amplitude** (via the API
destination → EU HTTP V2; ignores the lead events, which are sent server-side), the **Meta Pixel**
(allowlist: only PageView + Lead, plus Contact for a call / WhatsApp tap), and **Google Ads** (gtag,
allowlist: only the lead conversions and the optional contact one,
with **enhanced conversions for leads** — email + name + city read from the marketing-gated lead
event `data` and hashed by gtag). `qed.js` fires `lead start` client-side too (Google secondary
conversion; the Pixel and Amplitude both ignore it). `crosssell click` carries `to`, `placement`
(`hero` for a link inside a `.hero` section, else the nearest enclosing id; `/corporate/` has no
cross-sell link outside the footer since its strip became an in-page `#price` link), `href` and
`label`; `cta click` has the same
`placement` rule, so the phone sticky bar's taps are `cx-sticky` and the header's "Let's talk"
button, which sits outside the hero and `.nav__links`, is `body` (MEASUREMENT-PLAN.md section 4
says how to read them). The
`FUNNEL_HREF` regex in `qed.js` decides which links count, so a new funnel path must be added
there: a plain link to a path it doesn't list is measured as nothing.

**Lead value** (`leadValue(page, city)` in `forms.ts`, EUR per completed lead = typical deal x
assumed close rate; assumptions, recalibrate from real Brevo close rates): corporate 40 (~270 € x
~12-15% paid close), celebrations 30 (~150 € x ~20%), both cut in Oct
2026 for the cenas push and due a recalibration after 20 ad leads; venues 50 (placeholder),
partners by city population tier: large ≥500k 250, medium 100k-500k 150, small/unknown 100
(~5% signed x first-year 5,000 / 3,000 / 2,000 €). `lead start` = 20% of that. The step-2 response is
`{ok:true, value}` and `qed.js` sends that value on the Pixel `lead complete` so the deduped
Pixel/CAPI pair agrees; its fallback and `lead start` use the page default (partners 150).
Corporate gets its value from the step-1 response instead (see Contact-first below).

**Contact-first corporate form (Oct 2026).** `<form data-contact-first>` (`/corporate/`;
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
`_capture` takes the classic path. The cards post their labels through `data-i18n-value`:
the portal decodes `eventType` by exact EN/ES label (an unknown one becomes null) and the server requires it, so don't "improve" them or
drop a card. The step-2 format select keeps an empty first option, because `collect()` snapshots
the whole form and without it step 1 posts the select's default for everyone.

**One corporate page, two audiences (Oct 2026).** `/corporate/` sets `window.QED_SITE =
"corporate"` and posts `page=corporate` for booker and organiser alike, so section, product,
funnel, lead value, Brevo list, templates #7/#8 and the portal's source are the same for both.
(While `/team-events/` existed it did the same; an unknown `page` falls through every per-page map:
lead value 50, no Brevo list, no mapped product.) The likely audience travels in one hidden field,
`audience` (`booker` or `organiser`), which `collect()` posts on every step and consent replay. The
VAT switch sets it (see "VAT switch"): `organiser` while prices show VAT included, `booker`
otherwise. The server honours only the exact string `organiser`; anything else on a corporate post,
including no field at all, is `booker` (`audienceOf` in `forms.ts`, unchanged by the merge). It is
read in three places: the Telegram call alert's headline (`Equipo` / `Team` against `Empresa` /
`Corporate`), the `Audience:` item in `metaLine` (Brevo `NOTES` and the deal description are built
from the same text) and the Brevo deal name (suffix ` (equipo)` on a Spanish lead, ` (team)` on an
English one, organiser only); `node scripts/audience.test.mjs` checks all three. Nothing else
reads it: no client global, no Amplitude property, no Brevo attribute, no `walker.js` rebuild. The
portal receives the raw field with the rest of the payload and interprets nothing. It records the
VAT state when the form was sent, not the person. `MEASUREMENT-PLAN.md` section 4 says how to read
the two apart.

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
`GOOGLE_ADS_LABEL_COMPLETE` + `GOOGLE_ADS_LABEL_START` (+ optional `GOOGLE_ADS_LABEL_CONTACT`, the secondary
call / WhatsApp tap conversion). Server secrets read at function runtime:
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

An organiser lead (VAT switch on) is a corporate lead for all of this (list
`BREVO_LIST_ID_CORPORATE`, `LEAD_SOURCE=corporate`, templates #7/#8). The audience shows only as the deal name suffix and as
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

`/corporate/` carries `?v=20261023` on `qed.css`, `corporate.css`, `i18n-common.js`,
`i18n-corporate.js` and `consent.js` (the call / WhatsApp block and the WhatsApp button that replaced
the Brevo chat), `?v=20261024` on `qed.js` (the first-tap marker), `?v=20261015` on `cena-variant.js` and `?v=20261010` on `i18n.js`.
`/celebrations/` loads `corporate.css` and `i18n-celebrations.js` at `?v=20261023` too. The other pages
load `qed.css` and `qed.js` under plain URLs, so for up to a day a returning visitor there can get the
WhatsApp button unstyled (the SVG's own `width`/`height` keep it a 30px icon at the foot of the page)
and clicks filed as `outbound click` instead of `contact click`. `walker.js` and `phone-countries.js`
are plain URLs.

The rule for the next edit: when you change a `/shared/` file `/corporate/` loads, bump its `?v=`
there to a value higher than any already on the page, and on `/celebrations/` too when the file is
`corporate.css`; a plain URL gets its first `?v=` in the same change. `corporate.css` is the one
that bites. It used to be inline, so a CSS fix was atomic with the HTML; as a `/shared/` file a CSS-only edit reaches
returning visitors up to a day late, and yesterday's stylesheet against today's markup is the bad
case: a `#cx-sticky` with no `.cx-sticky` rule is an unstyled link at the foot of the page, and the
hero copy lands 14px under the nav, over the photo, with no clear window above it on a phone. The
other six pages load `qed.css` and `qed.js` under plain URLs and pick the phone-pass changes up when
their cached copies expire (up to a day): harmless, because the `qed.css` rules are scoped (see
"Phone pass") and the `qed.js` additions return early without `#cx-sticky` or
`[data-contact-first]`.

The same window applies to corrected facts and new mechanisms: for up to a day a returning visitor
can run new HTML against yesterday's `i18n-*.js` / `i18n.js` / `qed.js` (e.g. the TDT city lists
still naming Barcelona, `data-lang-hide` ignored). Don't hand-add `?v=` queries to fix it: the
pending hashed-asset build rewrites the exact string `"/shared/<file>.js"`, so a versioned URL
would slip past it and 404. That parked build (branch `build-dist-refactor`) also hard-codes its
page list (`SRC_PAGES`) and hashed-asset list (`assetsToHash`): before it is revived it must gain
`corporate.css` and `cena-variant.js`, keep the `/team-events/` 301 in `netlify.toml`, and cope with
`?v=` suffixes.

## Deploy

**`git push` to `main` auto-deploys BOTH brands** (each Netlify site builds from this repo/branch
with its own `BRAND`). There is no staging gate — a push is live on both domains within a couple
of minutes. There is no build/test command beyond `node build.mjs`.

To preview locally (static pages plus the Netlify lead-capture functions), run `npm run dev`
(`netlify dev`). It serves the unbranded working tree as-is — no `BRAND`, no About-partial
injection, no SEO tag rewrite — so it won't show per-brand slugs, favicons, or ES-localized
`<title>`/meta tags; use the `git add -A && node build.mjs` workaround above to check those.
