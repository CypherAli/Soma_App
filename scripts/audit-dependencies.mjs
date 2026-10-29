import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { auditFindings, mitigatedAdvisory } from "./lib/audit-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = process.env.npm_execpath;
if (!cli) throw Error("Run through npm run audit:security.");
const audit = spawnSync(process.execPath, [cli, "audit", "--json"], {
  cwd: root,
  encoding: "utf8",
  windowsHide: true,
  maxBuffer: 8 * 1024 * 1024,
});
if (audit.error || ![0, 1].includes(audit.status))
  throw Error("npm audit failed; security status is unknown.");
const report = JSON.parse(audit.stdout);
const findings = auditFindings(report);
if (findings.length)
  throw Error(`Unreviewed vulnerabilities:\n${findings.join("\n")}`);
// The exception is valid only with the actual installed backport and attack regressions.
if (report.vulnerabilities.deepmerge) {
  if (Date.now() >= Date.parse("2026-11-28T00:00:00Z"))
    throw Error("Review the temporary Deepmerge exception before release.");
  for (const node of report.vulnerabilities.deepmerge.nodes) {
    if (
      JSON.parse(readFileSync(resolve(root, node, "package.json"))).version !==
      "4.3.1"
    )
      throw Error("Review the Deepmerge backport for this version.");
    for (const file of ["index.js", "dist/cjs.js", "dist/umd.js"])
      if (
        !readFileSync(resolve(root, node, file), "utf8").includes(
          "SOMA security: filter prototype-sensitive keys",
        )
      )
        throw Error(`Missing installed Deepmerge guard: ${file}`);
  }
}
const regression = spawnSync(
  process.execPath,
  ["scripts/test-dependency-security.cjs"],
  { cwd: root, stdio: "inherit", windowsHide: true },
);
if (regression.status !== 0) process.exit(regression.status || 1);
console.log(
  `Audit metadata: ${JSON.stringify(report.metadata.vulnerabilities)}`,
);
if (report.vulnerabilities.deepmerge)
  console.log(
    `Known low advisory with tested local backport; review by 2026-11-28: ${mitigatedAdvisory}`,
  );
else console.log("No advisories reported.");
