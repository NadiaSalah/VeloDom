/**
 * ----------------------------------------
 * Module: VeloDom CLI Branding
 * ----------------------------------------
 *
 * Provides the dependency-free VeloDom wordmark used by interactive
 * CLI help and scaffolding output. Branding stays outside command logic so
 * JSON reports, piped output, and CI logs remain stable and machine-readable.
 * ----------------------------------------
 */

interface CliLogoOptions {
  color?: boolean;
  columns?: number;
}

const ANSI = Object.freeze({
  accent: "\u001B[38;5;45m",
  brand: "\u001B[38;5;141m",
  dim: "\u001B[38;5;250m",
  reset: "\u001B[0m",
  strong: "\u001B[1m"
});

const LOGO_LINES = [
  "██╗   ██╗███████╗██╗      ██████╗ ██████╗  ██████╗ ███╗   ███╗",
  "╚██╗ ██╔╝██╔════╝██║     ██╔═══██╗██╔══██╗██╔═══██╗████╗ ████║",
  " ╚████╔╝ █████╗  ██║     ██║   ██║██║  ██║██║   ██║██╔████╔██║",
  "  ╚██╔╝  ██╔══╝  ██║     ██║   ██║██║  ██║██║   ██║██║╚██╔╝██║",
  "   ╚═╝   ███████╗███████╗╚██████╔╝██████╔╝╚██████╔╝██║ ╚═╝ ██║"
].join("\n");

const LOGO_TAGLINE = "◇  VeloDom CLI  ·  HTML-first · compiler-first · vanilla-friendly";

/**
 * Formats the VeloDom CLI wordmark for an interactive terminal.
 *
 * @param {CliLogoOptions} options
 * @returns {string} A large wordmark, or compact title on narrow terminals.
 */
export function formatVeloDomLogo(options: CliLogoOptions = {}): string {
  if (options.columns !== undefined && options.columns < 64) {
    return options.color
      ? `${ANSI.strong}${ANSI.brand}VeloDom CLI${ANSI.reset}`
      : "VeloDom CLI";
  }
  if (options.color !== true) return `${LOGO_LINES}\n${LOGO_TAGLINE}`;

  const { accent, brand, dim, reset, strong } = ANSI;

  return [
    `${accent}${LOGO_LINES}${reset}`,
    `${accent}◇${reset}  ${strong}${brand}VeloDom CLI${reset}  ${dim}· HTML-first · compiler-first · vanilla-friendly${reset}`
  ].join("\n");
}

/**
 * Resolves whether CLI branding should use ANSI colors.
 *
 * Explicit no-color settings win. Explicit color can override a dumb terminal
 * or CI detection; otherwise only interactive, non-CI output receives color.
 *
 * @param {Set<string>} flags Parsed CLI flags.
 * @returns {boolean} Whether ANSI color output is safe and requested.
 */
export function shouldUseCliColor(flags: Set<string>): boolean {
  if (flags.has("no-color") || process.env.NO_COLOR !== undefined) return false;
  if (flags.has("color")) return true;
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0") return true;
  if (process.env.FORCE_COLOR === "0" || process.env.TERM === "dumb") return false;

  return !process.env.CI && Boolean(process.stdout.isTTY);
}
