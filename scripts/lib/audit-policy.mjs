export const mitigatedAdvisory =
  "https://github.com/advisories/GHSA-gcqx-w48m-w2h4";

export function auditFindings(report) {
  if (
    report.error ||
    !report.vulnerabilities ||
    !report.metadata?.vulnerabilities
  )
    throw Error("npm audit did not return a complete report.");
  const findings = new Map();
  for (const [name, item] of Object.entries(report.vulnerabilities)) {
    if (["critical", "high", "moderate"].includes(item.severity))
      findings.set(name, `${name}: ${item.severity}`);
    const leaves = item.via.filter((entry) => typeof entry === "object");
    for (const entry of item.via)
      if (
        typeof entry === "string" &&
        !Object.hasOwn(report.vulnerabilities, entry)
      )
        findings.set(name, `${name}: unresolved advisory chain ${entry}`);
    for (const entry of leaves) {
      if (
        entry.name !== "deepmerge" ||
        entry.severity !== "low" ||
        entry.url !== mitigatedAdvisory
      )
        findings.set(
          entry.url || entry.name,
          `${entry.name}: ${entry.severity} ${entry.url || ""}`,
        );
    }
    if (!item.via.length)
      findings.set(name, `${name}: missing advisory evidence`);
  }
  if (
    Object.keys(report.vulnerabilities).length &&
    !Object.values(report.vulnerabilities).some((item) =>
      item.via.some((entry) => typeof entry === "object"),
    )
  )
    findings.set("missing-leaf", "No advisory leaf evidence found.");
  return [...findings.values()];
}
