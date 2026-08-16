/**
 * ----------------------------------------
 * Module: CLI Contracts
 * ----------------------------------------
 *
 * Shares small command-line contracts between orchestration, analysis,
 * reporting, and scaffolding without coupling those modules to each other.
 * ----------------------------------------
 */

/** Output and working-directory services supplied to CLI commands. */
export interface CliContext {
  cwd: string;
  stderr(message: string): void;
  stdout(message: string): void;
}

/** Parsed CLI flags, named options, and positional values. */
export interface ParsedArgs {
  flags: Set<string>;
  options: Record<string, string>;
  values: string[];
}

/** One folder-mode or single-file resource discovered by project analysis. */
export interface DiscoveredModule {
  kind: "folder" | "single-file";
  name: string;
  route?: string;
  source: string;
}

/** Size information for one source or generated asset. */
export interface FileSizeReport {
  bytes: number;
  name: string;
  source: string;
}
