/**
 * ----------------------------------------
 * Module: VeloDom CLI Branding
 * ----------------------------------------
 *
 * Provides the small, dependency-free VeloDom wordmark used by interactive
 * CLI help and scaffolding output. Branding stays outside command logic so
 * JSON reports, piped output, and CI logs remain stable and machine-readable.
 * ----------------------------------------
 */

interface CliLogoOptions {
  color?: boolean;
}

const ANSI = Object.freeze({
  accent: "\u001B[38;5;45m",
  brand: "\u001B[38;5;141m",
  dim: "\u001B[38;5;250m",
  reset: "\u001B[0m",
  strong: "\u001B[1m"
});

const PLAIN_LOGO = [
  "╭──────────────────────────────────────────────╮",
  "│  ◇  VeloDom CLI                              │",
  "│     HTML-first · compiler-first · vanilla    │",
  "╰──────────────────────────────────────────────╯"
].join("\n");

/**
 * Formats the VeloDom CLI wordmark for an interactive terminal.
 *
 * @param {CliLogoOptions} options
 * @returns {string} A four-line logo with optional ANSI color sequences.
 */
export function formatVeloDomLogo(options: CliLogoOptions = {}): string {
  if (options.color !== true) return PLAIN_LOGO;

  const { accent, brand, dim, reset, strong } = ANSI;

  return [
    `${accent}╭──────────────────────────────────────────────╮${reset}`,
    `│  ${accent}◇${reset}  ${strong}${brand}VeloDom${reset} ${dim}CLI${reset}                              │`,
    `│     ${dim}HTML-first · compiler-first · vanilla${reset}    │`,
    `${accent}╰──────────────────────────────────────────────╯${reset}`
  ].join("\n");
}

/**
 * Resolves whether CLI branding should use ANSI colors.
 *
 * `NO_COLOR` and dumb terminals always win; `FORCE_COLOR` is useful for
 * supported CI snapshots and interactive shells that wrap stdout.
 *
 * @param {Set<string>} flags Parsed CLI flags.
 * @returns {boolean} Whether ANSI color output is safe and requested.
 */
export function shouldUseCliColor(flags: Set<string>): boolean {
  if (flags.has("no-color") || process.env.NO_COLOR !== undefined) return false;
  if (flags.has("color")) return true;
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0") return true;
  if (process.env.FORCE_COLOR === "0" || process.env.TERM === "dumb") return false;

  return Boolean(process.stdout.isTTY);
}
