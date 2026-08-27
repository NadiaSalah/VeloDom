/**
 * ----------------------------------------
 * Module: Public Scaffolder Core
 * ----------------------------------------
 *
 * Exposes the shared Node-only creation pipeline used by every VeloDom project
 * creation command. Browser applications do not import this entry point.
 * ----------------------------------------
 */

/** Creates one standalone application through the shared Node-only pipeline. */
export { createVeloDomProject } from "./create-project.ts";
/** Detects package-manager intent from the invoking npm-compatible user agent. */
export { detectPackageManager } from "./package-manager.ts";
/** Public project scaffolder contracts for Node wrappers and integrations. */
export type {
  ScaffoldLanguage,
  ScaffoldPackageManager,
  ScaffoldPlan,
  ScaffoldRequest,
  ScaffoldResult,
  ScaffoldTesting,
  StarterName
} from "./types.ts";
