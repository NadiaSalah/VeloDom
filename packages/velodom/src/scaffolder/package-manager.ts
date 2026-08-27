/**
 * ----------------------------------------
 * Module: Scaffolder Package Manager
 * ----------------------------------------
 *
 * Detects package-manager intent and runs install/dev commands with argument
 * arrays. No user input is interpolated into a shell command.
 * ----------------------------------------
 */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import type { ScaffoldPackageManager } from "./types.ts";

/** Detects npm, pnpm, Yarn, or Bun from the invoking user agent. */
export function detectPackageManager(
  userAgent = process.env.npm_config_user_agent || ""
): ScaffoldPackageManager {
  const name = userAgent.trim().split("/")[0]?.toLowerCase();

  if (name === "pnpm" || name === "yarn" || name === "bun") return name;
  return "npm";
}

/** Returns the package-manager-specific command used in human instructions. */
export function formatPackageScript(
  packageManager: ScaffoldPackageManager,
  script: string
) {
  if (packageManager === "pnpm" || packageManager === "yarn") {
    return `${packageManager} ${script}`;
  }

  return `${packageManager} run ${script}`;
}

/** Runs dependency installation with inherited terminal output. */
export function installDependencies(
  cwd: string,
  packageManager: ScaffoldPackageManager
) {
  const args = packageManager === "yarn" ? [] : ["install"];
  return runPackageManager(cwd, packageManager, args);
}

/** Starts the generated development server and waits for its process. */
export function startDevelopmentServer(
  cwd: string,
  packageManager: ScaffoldPackageManager
) {
  const args = packageManager === "yarn" || packageManager === "pnpm"
    ? ["dev"]
    : ["run", "dev"];
  return runPackageManager(cwd, packageManager, args);
}

function runPackageManager(
  cwd: string,
  packageManager: ScaffoldPackageManager,
  args: string[]
) {
  const invocation = createInvocation(packageManager, args);

  return new Promise<void>((resolve, reject) => {
    const child = spawn(invocation.command, invocation.args, {
      cwd,
      shell: false,
      stdio: "inherit"
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0 || signal === "SIGINT") {
        resolve();
        return;
      }

      reject(new Error(
        `${packageManager} ${args.join(" ")} exited with code ${code ?? "unknown"}.`
      ));
    });
  });
}

function createInvocation(
  packageManager: ScaffoldPackageManager,
  args: string[]
) {
  if (process.platform !== "win32") {
    return { command: packageManager, args };
  }

  if (packageManager === "npm") {
    const npmCli = process.env.npm_execpath
      || join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");

    return {
      command: process.execPath,
      args: [npmCli, ...args]
    };
  }

  // Windows package-manager launchers are .cmd files. The manager name is a
  // validated enum and all following arguments are framework-owned constants.
  return {
    command: process.env.ComSpec || "cmd.exe",
    args: ["/d", "/s", "/c", `${packageManager}.cmd`, ...args]
  };
}
