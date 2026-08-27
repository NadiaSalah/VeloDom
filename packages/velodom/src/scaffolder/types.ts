/**
 * ----------------------------------------
 * Module: Project Scaffolder Contracts
 * ----------------------------------------
 *
 * Describes the Node-only project creation plan shared by `create-velodom`,
 * `velodom`, and `vd create`. These contracts never enter the browser runtime.
 * ----------------------------------------
 */

import type { CliContext } from "../cli/types.ts";

/** Starter applications maintained by the VeloDom package. */
export type StarterName = "minimal" | "blog" | "empty";

/** Application source language selected by the project author. */
export type ScaffoldLanguage = "javascript" | "typescript";

/** Supported package managers for installation and command hints. */
export type ScaffoldPackageManager = "npm" | "pnpm" | "yarn" | "bun";

/** Optional test layers installed into a generated application. */
export type ScaffoldTesting = "none" | "unit" | "e2e" | "all";

/** Fully resolved, internally consistent project creation plan. */
export interface ScaffoldPlan {
  destination: string;
  eslint: boolean;
  git: boolean;
  i18n: boolean;
  install: boolean;
  language: ScaffoldLanguage;
  packageManager: ScaffoldPackageManager;
  prettier: boolean;
  projectName: string;
  router: boolean;
  start: boolean;
  starter: StarterName;
  tailwind: boolean;
  testing: ScaffoldTesting;
}

/** Parsed command input consumed by the shared project scaffolder. */
export interface ScaffoldRequest {
  context: CliContext;
  flags: Set<string>;
  options: Record<string, string>;
  projectName?: string;
}

/** Outcome reported after creating and optionally installing an application. */
export interface ScaffoldResult {
  createdDirectory: string;
  dependenciesInstalled: boolean;
  devServerStarted: boolean;
  plan: ScaffoldPlan;
}
