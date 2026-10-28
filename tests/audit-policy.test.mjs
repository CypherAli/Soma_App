import assert from "node:assert/strict";
import { test } from "node:test";
import {
  auditFindings,
  mitigatedAdvisory,
} from "../scripts/lib/audit-policy.mjs";
const report = (severity, via) => ({
  metadata: { vulnerabilities: {} },
  vulnerabilities: { deepmerge: { severity, via } },
});
const known = { name: "deepmerge", severity: "low", url: mitigatedAdvisory };
test("audit exception is limited to the reviewed low leaf advisory", () => {
  assert.deepEqual(auditFindings(report("low", [known])), []);
  assert.ok(auditFindings(report("high", [known])).length);
  assert.ok(
    auditFindings(
      report("low", [{ ...known, url: "https://unknown.test/new" }]),
    ).length,
  );
  assert.ok(auditFindings(report("low", [])).length);
  assert.ok(auditFindings(report("low", ["unknown-package"])).length);
  assert.throws(
    () => auditFindings({ error: { code: "NETWORK" } }),
    /complete report/,
  );
});
