// Checks the booker/organiser split in netlify/lib/forms.ts. Run: node scripts/audience.test.mjs
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const dir = mkdtempSync(join(process.cwd(), ".audience-"));
try {
  const out = join(dir, "forms.mjs");
  await build({ entryPoints: ["netlify/lib/forms.ts"], bundle: true, platform: "node", format: "esm", packages: "external", outfile: out, logLevel: "error" });
  const f = await import(pathToFileURL(out).href);
  const at = new Date("2026-10-13T12:30:00+02:00");
  const lead = { firstName: "Ana", lastName: "", email: "ana@example.com", phone: "600123456", phoneDial: "34", eventType: "Company dinner / Christmas", lang: "ES", country: "ES" };
  const org = { ...lead, audience: "organiser" };

  assert.equal(f.audienceOf(org, "corporate"), "organiser");
  assert.equal(f.audienceOf(lead, "corporate"), "booker");                       // cached page, no field
  assert.equal(f.audienceOf({ ...lead, audience: "<b>x</b>" }, "corporate"), "booker");
  assert.equal(f.audienceOf(org, "celebrations"), "");                           // not a corporate post
  assert.match(f.metaLine(org, "corporate"), /Page: corporate \| Audience: organiser/);
  assert.match(f.metaLine(lead, "corporate"), /Page: corporate \| Audience: booker/);
  assert.doesNotMatch(f.metaLine(org, "celebrations"), /Audience/);
  assert.match(f.callAlertText(org, "corporate", at), /LLAMAR \[(QED|TDT)\] Equipo · /);
  assert.match(f.callAlertText(lead, "corporate", at), /LLAMAR \[(QED|TDT)\] Empresa · /);
  assert.match(f.callAlertText({ ...org, lang: "EN" }, "corporate", at), /CALL \[(QED|TDT)\] Team · /);
  assert.match(f.dealName(org, "corporate"), / \(equipo\)$/);                    // lead.lang is ES
  assert.match(f.dealName({ ...org, lang: "EN" }, "corporate"), / \(team\)$/);
  assert.doesNotMatch(f.dealName(lead, "corporate"), /\((team|equipo)\)/);
  assert.doesNotMatch(f.dealName(org, "celebrations"), /\((team|equipo)\)/);     // celebrations shares the case
  assert.equal(f.leadValue("corporate"), 40);                                    // one value for both audiences
  console.log("ok   audience: 15 assertions");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
