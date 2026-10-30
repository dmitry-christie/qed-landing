// PreToolUse hook (Bash): before Claude runs `git push`, make sure the "registered players"
// counter was refreshed from Supabase in the last hour. If not, the push is held and Claude is
// told how to refresh it. A hook can't call MCP itself, so it hands the job to Claude.
// Pushes from your own terminal are not affected.

import { statSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const MAX_AGE_MS = 60 * 60 * 1000;

let input = "";
for await (const chunk of process.stdin) input += chunk;
const cmd = JSON.parse(input || "{}")?.tool_input?.command ?? "";
// A real `git push` (also `git -C dir push`) at the start of the command or after ; && || |,
// not the words inside a quoted string.
if (!/(?:^|[;&|\n]\s*)git\s+(?:-C\s+\S+\s+)?push\b/.test(cmd.trim())) process.exit(0);

try {
  const gitDir = execSync("git rev-parse --git-common-dir", { encoding: "utf8" }).trim();
  const stamp = join(gitDir, "qed-stats-refreshed");
  if (Date.now() - statSync(stamp).mtimeMs < MAX_AGE_MS) process.exit(0);
} catch {
  // no stamp yet: fall through and ask for a refresh
}

const reason = [
  "Before pushing, refresh the registered-players counter from Supabase:",
  '1. Supabase MCP execute_sql on project nilgyhkfkeotpqpqkjwf ("QED"): select count(*) from users;',
  "2. node scripts/update-stats.mjs <that count>",
  '3. If it changed index.html, corporate/index.html or partners/index.html, commit them ("Stats: N registered players").',
  "4. Run the push again.",
  "Locations counts are manual (map, city lists, OG images); leave them.",
].join("\n");

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: reason,
  },
}));
