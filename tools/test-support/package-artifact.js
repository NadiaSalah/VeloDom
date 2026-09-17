/**
 * Audits npm's actual pack manifest without reading or logging file contents.
 * Repository-only helper; this policy never enters the published framework.
 */

/** Returns packaging violations for allowlisted paths, targets, and size budgets. */
export function auditPackageArtifact(artifact, manifest, budget) {
  const violations = [];
  const allowed = new Set(["package.json", ...(manifest.files || [])]);
  const paths = new Set();

  if (artifact.name !== manifest.name) violations.push("Package identity mismatch.");
  if (artifact.version !== manifest.version) violations.push("Package version mismatch.");
  if (!Array.isArray(artifact.files) || artifact.files.length === 0) {
    return [...violations, "Package contains no files."];
  }

  for (const { path } of artifact.files) {
    if (typeof path !== "string") {
      violations.push("Package file has no path.");
      continue;
    }
    const parts = path.split("/");
    if (!allowed.has(parts[0]) || parts.some(part => part === ".." || part === ".") || path.includes("\\")) {
      violations.push(`Non-allowlisted file: ${path}`);
    }
    if (parts.some(part => /^(?:node_modules|\.git|\.codex|coverage|test-results|playwright-report|\.npm-cache|dist)$/.test(part))
      || parts.some(part => /^(?:\.env(?:\..*)?|\.npmrc|npm_recovery_codes\.txt|package-lock\.json)$/.test(part))
      || /\.(?:log|tgz|tsbuildinfo|pem|key)$/i.test(path)) {
      violations.push(`Private or generated artifact: ${path}`);
    }
    if (paths.has(path)) violations.push(`Duplicate file: ${path}`);
    paths.add(path);
  }

  // Every declared entry must work from the tarball, not just the source checkout.
  const targets = [...collectTargets(manifest.exports), ...Object.values(manifest.bin || {})];
  for (const target of targets) {
    if (!paths.has(target.replace(/^\.\//, ""))) violations.push(`Missing entry: ${target}`);
  }
  for (const file of manifest.files || []) {
    if (!paths.has(file) && ![...paths].some(path => path.startsWith(`${file}/`))) {
      violations.push(`Missing package content: ${file}`);
    }
  }
  for (const [field, limit] of Object.entries(budget)) {
    if (!Number.isFinite(artifact[field]) || artifact[field] <= 0 || artifact[field] > limit) {
      violations.push(`${field} must be positive and at most ${limit}; received ${artifact[field]}.`);
    }
  }
  return violations;
}

/** Walks conditional package exports without inventing a second export list. */
function collectTargets(value) {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(collectTargets);
  return [];
}
