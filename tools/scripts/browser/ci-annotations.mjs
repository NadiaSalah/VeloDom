/**
 * ----------------------------------------
 * Module: Browser CI Annotations
 * ----------------------------------------
 * Converts failed browser targets into concise GitHub Actions annotations.
 * The annotation omits page-body snapshots, which remain available only in
 * the detailed test log.
 * ----------------------------------------
 */

/**
 * Formats failed browser targets as GitHub Actions error commands.
 *
 * @param {Array<{label: string, status: string, error?: Error}>} results
 * @returns {string[]}
 */
export function formatBrowserFailureAnnotations(results) {
  return results
    .filter(result => result.status === "failed")
    .map(result => {
      const lines = String(result.error?.message || "Unknown browser failure")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
      const location = lines.find(line => line.startsWith("Current URL:"));
      const detail = lines.at(-1);
      const summary = [
        result.label,
        lines[0],
        location,
        detail !== lines[0] ? detail : null
      ].filter(Boolean).join(" | ");

      return `::error title=VeloDom browser E2E::${escapeWorkflowData(summary)}`;
    });
}

function escapeWorkflowData(value) {
  return value
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}
