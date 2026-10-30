// Writes the "registered players" counter into every page that shows it.
//
//   node scripts/update-stats.mjs <players>
//
// The number comes from the Supabase project "QED" (nilgyhkfkeotpqpqkjwf):
//   select count(*) from users;
// That is the definition the 7,510 of 27 Sep 2026 matches exactly. Claude runs that query
// through the Supabase MCP before a push (see .claude/hooks/stats-before-push.mjs), then this
// script. Each counter is a `<span data-stat="players" data-count="N">N,NNN</span>`; the span
// keeps its "+" outside. The locations counts are not touched: they follow the map, the city
// lists and the OG images, which are edited by hand.
//
// On success it stamps .git/qed-stats-refreshed, which the pre-push hook reads.

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const PAGES = ["index.html", "corporate/index.html", "partners/index.html"];
const RE = /<span data-stat="players" data-count="(\d+)">[\d,.]+<\/span>/g;

const args = process.argv.slice(2);
const force = args.includes("--force");
const players = Number(args.find((a) => !a.startsWith("--")));
if (!Number.isInteger(players) || players <= 0) {
  console.error("usage: node scripts/update-stats.mjs <players> [--force]");
  process.exit(1);
}

let changed = 0;
for (const page of PAGES) {
  const html = readFileSync(page, "utf8");
  const found = [...html.matchAll(RE)];
  if (found.length === 0) {
    console.error(`[stats] ${page}: no data-stat="players" counter found`);
    process.exit(1);
  }
  for (const [, current] of found) {
    // A big drop means the wrong project or query, not players leaving.
    if (!force && players < Number(current) * 0.95) {
      console.error(`[stats] ${page}: ${players} is well below the current ${current}; check the query or pass --force`);
      process.exit(1);
    }
  }
  const next = html.replace(
    RE,
    `<span data-stat="players" data-count="${players}">${players.toLocaleString("en-US")}</span>`,
  );
  if (next !== html) {
    writeFileSync(page, next);
    changed++;
    console.log(`[stats] ${page}: players -> ${players}`);
  }
}
if (changed === 0) console.log(`[stats] already ${players}, nothing to change`);

const gitDir = execSync("git rev-parse --git-common-dir", { encoding: "utf8" }).trim();
writeFileSync(join(gitDir, "qed-stats-refreshed"), `${players} ${new Date().toISOString()}\n`);
