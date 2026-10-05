// Checks the Telegram call-by line (netlify/lib/forms.ts → callByLine) against fixed Madrid
// clocks, including the no-call holidays. Run: node scripts/callby.test.mjs
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(process.cwd(), ".callby-"));
try {
  const out = join(dir, "forms.mjs");
  await build({ entryPoints: ["netlify/lib/forms.ts"], bundle: true, platform: "node", format: "esm", packages: "external", outfile: out, logLevel: "error" });
  const { callByLine } = await import(pathToFileURL(out).href);

  const cases = [
    ["2026-10-13T12:30:00+02:00", "Llamar antes de las 14:30 (L-V 10-19 h)"],
    ["2026-10-13T18:00:00+02:00", "Llamar antes de las 19:00 (L-V 10-19 h)"],
    ["2026-10-08T20:00:00+02:00", "Llamar antes de las 11:00 del martes 13 (L-V 10-19 h)"],
    ["2026-10-09T11:00:00+02:00", "Llamar antes de las 11:00 del martes 13 (L-V 10-19 h)"],
    ["2026-10-10T12:00:00+02:00", "Llamar antes de las 11:00 del martes 13 (L-V 10-19 h)"],
    ["2026-12-06T12:00:00+01:00", "Llamar antes de las 11:00 del lunes 7 (L-V 10-19 h)"],
    ["2026-12-07T20:00:00+01:00", "Llamar antes de las 11:00 del miércoles 9 (L-V 10-19 h)"],
    ["2026-12-24T20:00:00+01:00", "Llamar antes de las 11:00 del lunes 28 (L-V 10-19 h)"],
    ["2026-12-31T20:00:00+01:00", "Llamar antes de las 11:00 del lunes 4 (L-V 10-19 h)"],
  ];
  let failed = 0;
  for (const [at, want] of cases) {
    const got = callByLine(true, new Date(at));
    const ok = got === want;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${at} -> ${got}${ok ? "" : `   (want: ${want})`}`);
  }
  console.log(`EN sample: ${callByLine(false, new Date("2026-10-08T20:00:00+02:00"))}`);
  if (failed) { console.error(`${failed} failing`); process.exitCode = 1; }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
