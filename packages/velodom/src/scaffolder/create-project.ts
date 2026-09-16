/**
 * ----------------------------------------
 * Module: Project Creation Pipeline
 * ----------------------------------------
 *
 * Copies one starter, composes optional feature installers, generates package
 * metadata, and optionally runs Git, dependency installation, and Vite.
 * ----------------------------------------
 */

import { spawn } from "node:child_process";
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { installApplicationFeatures } from "./features/application-files.ts";
import { writeProjectConfiguration } from "./features/package-files.ts";
import {
  formatPackageScript,
  installDependencies,
  startDevelopmentServer
} from "./package-manager.ts";
import { resolveScaffoldPlan } from "./options.ts";
import type {
  ScaffoldPlan,
  ScaffoldRequest,
  ScaffoldResult
} from "./types.ts";

/** Creates a standalone VeloDom application from one resolved CLI request. */
export async function createVeloDomProject(
  request: ScaffoldRequest
): Promise<ScaffoldResult> {
  const plan = await resolveScaffoldPlan(request);
  const destinationState = await inspectDestination(plan.destination);
  let generated = false;

  try {
    if (!destinationState.exists) {
      await mkdir(plan.destination, { recursive: true });
      generated = true;
    }

    await copyStarter(plan);
    await normalizeTemplateDotfiles(plan.destination);
    await removeGeneratedMetadata(plan.destination);
    const version = await readFrameworkVersion();
    await installApplicationFeatures(plan);
    await writeProjectConfiguration(plan, version);
    await writeProjectReadme(plan);

    if (plan.git) {
      const initialized = await initializeGit(plan.destination);
      if (!initialized) {
        request.context.stdout("! Git was not available; project creation continued.");
      }
    }
  } catch (error) {
    if (generated) {
      await rm(plan.destination, { recursive: true, force: true });
    }
    throw error;
  }

  request.context.stdout(`✓ Created VeloDom project in ${displayPath(request.context.cwd, plan.destination)}`);
  let dependenciesInstalled = false;

  if (plan.install) {
    try {
      await installDependencies(plan.destination, plan.packageManager);
      dependenciesInstalled = true;
      request.context.stdout("✓ Dependencies installed");
    } catch (error) {
      request.context.stderr(
        `Dependency installation failed; the generated project was kept. ${errorMessage(error)}`
      );
      printNextSteps(request, plan, false);
      throw error;
    }
  }

  printEnabledFeatures(request, plan);

  if (plan.start && dependenciesInstalled) {
    request.context.stdout("Starting the VeloDom development server…");
    await startDevelopmentServer(plan.destination, plan.packageManager);
    return {
      createdDirectory: plan.destination,
      dependenciesInstalled,
      devServerStarted: true,
      plan
    };
  }

  printNextSteps(request, plan, dependenciesInstalled);
  return {
    createdDirectory: plan.destination,
    dependenciesInstalled,
    devServerStarted: false,
    plan
  };
}

/** Copies the starter. */
async function copyStarter(plan: ScaffoldPlan) {
  await cp(templateDirectory("default"), plan.destination, {
    recursive: true,
    force: true
  });
  await cp(templateDirectory(`starters/${plan.starter}`), plan.destination, {
    recursive: true,
    force: true
  });
}

/** Inspects the destination. */
async function inspectDestination(destination: string) {
  const entries = await readdir(destination).catch(error => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  });

  if (entries?.length) {
    throw new Error(`Refusing to create a project in non-empty folder "${destination}".`);
  }

  return { exists: entries !== null };
}

/** Normalizes the template dotfiles. */
async function normalizeTemplateDotfiles(destination: string) {
  const source = join(destination, "_gitignore");
  const target = join(destination, ".gitignore");
  const exists = await readFile(source, "utf8").catch(error => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  });

  if (exists !== null) await rename(source, target);
}

/** Removes the generated metadata. */
async function removeGeneratedMetadata(destination: string) {
  await Promise.all([
    "package-lock.json",
    "package.json",
    "jsconfig.json",
    "tsconfig.json",
    "vite.config.js",
    "vite.config.ts"
  ].map(file => rm(join(destination, file), { force: true })));
}

/** Reads the framework version. */
async function readFrameworkVersion() {
  const manifest = JSON.parse(await readFile(
    fileURLToPath(new URL("../../package.json", import.meta.url)),
    "utf8"
  )) as { version?: string };

  if (!manifest.version) throw new Error("VeloDom package version is missing.");
  return manifest.version;
}

/** Initializes the git. */
async function initializeGit(cwd: string) {
  return new Promise<boolean>(resolvePromise => {
    const child = spawn("git", ["init"], {
      cwd,
      shell: false,
      stdio: "ignore"
    });

    child.once("error", () => resolvePromise(false));
    child.once("exit", code => resolvePromise(code === 0));
  });
}

/** Writes the project readme. */
async function writeProjectReadme(plan: ScaffoldPlan) {
  const extension = plan.language === "typescript" ? "ts" : "js";
  const enabled = [
    plan.tailwind ? "Tailwind CSS" : "Plain CSS",
    plan.eslint ? "ESLint" : null,
    plan.prettier ? "Prettier" : null,
    plan.router ? "route examples" : null,
    plan.i18n ? "English/Arabic localization" : null,
    plan.lab ? "the optional local VeloDom Lab command" : null,
    plan.pwa ? "an explicit installable PWA build" : null,
    plan.testing !== "none" ? `${plan.testing} testing` : null
  ].filter(Boolean).join(", ");

  await writeText(join(plan.destination, "README.md"), `# ${plan.projectName}

Generated with VeloDom's **${plan.starter}** starter using ${plan.language}.

## Run

\`\`\`bash
${plan.packageManager} install
${formatPackageScript(plan.packageManager, "dev")}
${plan.lab ? `# Optional local inspector\n${formatPackageScript(plan.packageManager, "lab")}\n` : ""}
${plan.testing !== "none" ? `# Run the configured real test layers\nnpx vd test${plan.testing === "unit" ? " unit" : plan.testing === "e2e" ? " browser" : ""}\n` : ""}
\`\`\`

## Included

${enabled || "Only the minimum VeloDom application files."}

## Start editing

- Bootstrap: \`src/main.${extension}\`
- Pages: \`src/pages/\`
- Components: \`src/components/\` when the starter needs them
- Global styles: \`src/style.css\`

VeloDom discovers pages and components from folders. Keep application logic here
and import framework capabilities only from public \`velodom/*\` entry points.

Package-local AI guidance is available after installation at
\`node_modules/velodom/AI_CONTEXT.md\`.

Add an optional first-party capability later with \`npx vd add i18n\`,
\`npx vd add pwa\`, \`npx vd add tests --unit\`, or \`npx vd add lab\`. The installer refuses
conflicts and records generated-file ownership in \`.velodom/features.json\`.
When tests are configured, \`npx vd test\` delegates to the generated package
scripts; focused layers such as \`npx vd test unit\` never fake a passing result.
Run \`npx vd features\` before removing/upgrading managed features. A portable
\`npx vd preset export\` contains feature choices only and may be reviewed
before another project applies it.
Use \`npx vd inspect css\` and \`npx vd inspect assets\` for read-only build advice
about route styles, local asset usage, image dimensions, and responsive markup.
`);
}

/** Prints the enabled features. */
function printEnabledFeatures(request: ScaffoldRequest, plan: ScaffoldPlan) {
  const features = [
    plan.eslint ? "ESLint configured" : null,
    plan.prettier ? "Prettier configured" : null,
    plan.tailwind ? "Tailwind CSS configured" : null,
    plan.router ? "VeloDom route examples configured" : null,
    plan.i18n ? "English/Arabic localization configured" : null,
    plan.lab ? "VeloDom Lab command configured" : null,
    plan.pwa ? "VeloDom PWA build configured" : null,
    plan.testing !== "none" ? `${plan.testing} testing configured` : null,
    plan.git ? "Git initialized" : null
  ].filter((feature): feature is string => feature !== null);

  features.forEach(feature => request.context.stdout(`✓ ${feature}`));
}

/** Prints the next steps. */
function printNextSteps(
  request: ScaffoldRequest,
  plan: ScaffoldPlan,
  installed: boolean
) {
  const relativeDirectory = displayPath(request.context.cwd, plan.destination);
  const steps = [
    `  cd ${quotePath(relativeDirectory)}`,
    ...(!installed ? [`  ${plan.packageManager} install`] : []),
    `  ${formatPackageScript(plan.packageManager, "dev")}`
  ];

  request.context.stdout(`\nNext steps:\n\n${steps.join("\n")}\n\nHappy building with VeloDom ⚡`);
}

/** Performs the internal `templateDirectory()` operation. */
function templateDirectory(name: string) {
  return fileURLToPath(new URL(`../../templates/${name}/`, import.meta.url));
}

/** Performs the internal `displayPath()` operation. */
function displayPath(cwd: string, destination: string) {
  return relative(cwd, destination).replaceAll("\\", "/") || ".";
}

/** Performs the internal `quotePath()` operation. */
function quotePath(path: string) {
  return /\s/.test(path) ? JSON.stringify(path) : path;
}

/** Performs the internal `errorMessage()` operation. */
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/** Writes the text. */
async function writeText(file: string, source: string) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, source);
}
