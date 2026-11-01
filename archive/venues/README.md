# Archived: White-label / Marca blanca page (`/venues/`)

Taken off both sites on 1 Nov 2026. `/venues/` now 301s to the hub (`netlify.toml`).

What is here, as it was when it went down:

- `index.html` — the page (was `venues/index.html`)
- `i18n-venues.js` — its Spanish strings (was `shared/i18n-venues.js`)
- `venue-apply.ts` — its lead function (was `netlify/functions/venue-apply.ts`)

The git tag `archive/venues-page` marks the last commit with the page live, so the full
working state (links, build entries, shared keys such as `foot.venue`) is one checkout away.

`build.mjs` deletes this whole `archive/` folder from the publish tree, so none of it is served.

## To bring it back

1. Move the three files back to the paths above.
2. Add `"venues/"` to `PAGES` and `"venues/": "venues"` to `I18N_FILE` in `build.mjs` (same commit).
3. Remove the `/venues` 301 from `netlify.toml`.
4. Restore the footer/nav links and the `foot.venue` key (see the tag's diff), then run the
   i18n checks in `CLAUDE.md` and build both brands.
