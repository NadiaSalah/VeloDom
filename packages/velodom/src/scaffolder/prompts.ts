/**
 * ----------------------------------------
 * Module: Interactive Scaffolder Prompts
 * ----------------------------------------
 *
 * Provides a dependency-free, accessible terminal questionnaire. The small
 * prompt surface keeps project creation polished without adding browser or
 * package runtime dependencies.
 * ----------------------------------------
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type {
  ScaffoldLanguage,
  ScaffoldPackageManager,
  ScaffoldTesting,
  StarterName
} from "./types.ts";

/** Interactive values collected before a scaffold plan is resolved. */
export interface InteractiveScaffoldAnswers {
  eslint?: boolean;
  git?: boolean;
  i18n?: boolean;
  install?: boolean;
  lab?: boolean;
  language?: ScaffoldLanguage;
  mode?: "recommended" | "custom";
  prettier?: boolean;
  pwa?: boolean;
  projectName?: string;
  router?: boolean;
  start?: boolean;
  starter?: StarterName;
  tailwind?: boolean;
  testing?: ScaffoldTesting;
}

/** Collects only choices not already supplied by non-interactive flags. */
export async function promptForScaffold(
  initial: InteractiveScaffoldAnswers,
  packageManager: ScaffoldPackageManager
) {
  const controller = new AbortController();
  const onInterrupt = () => controller.abort();
  process.once("SIGINT", onInterrupt);
  const prompt = createInterface({ input: stdin, output: stdout });

  try {
    stdout.write("\nVeloDom ⚡\n\n");
    const answers = { ...initial };

    answers.projectName ||= await askText(
      prompt,
      "Project name",
      "my-velodom-app",
      controller.signal
    );
    answers.starter ||= await askSelect(
      prompt,
      "Select a starter",
      [
        ["minimal", "Minimal"],
        ["blog", "Blog"],
        ["empty", "Empty"]
      ],
      "minimal",
      controller.signal
    ) as StarterName;
    answers.mode ||= await askSelect(
      prompt,
      "Setup mode",
      [
        ["recommended", "Recommended"],
        ["custom", "Customize"]
      ],
      "recommended",
      controller.signal
    ) as "recommended" | "custom";

    if (answers.mode === "custom") {
      answers.language ||= await askSelect(
        prompt,
        "Language",
        [["javascript", "JavaScript"], ["typescript", "TypeScript"]],
        "typescript",
        controller.signal
      ) as ScaffoldLanguage;
      if (answers.tailwind === undefined) {
        answers.tailwind = await askSelect(
          prompt,
          "Styling",
          [["css", "Plain CSS"], ["tailwind", "Tailwind CSS"]],
          "css",
          controller.signal
        ) === "tailwind";
      }
      answers.eslint ??= await askConfirm(prompt, "Enable ESLint", true, controller.signal);
      answers.prettier ??= await askConfirm(prompt, "Enable Prettier", true, controller.signal);
      answers.lab ??= await askConfirm(
        prompt,
        "Add the optional local VeloDom Lab command",
        false,
        controller.signal
      );
      answers.pwa ??= await askConfirm(
        prompt,
        "Add the optional installable PWA build",
        false,
        controller.signal
      );
      answers.i18n ??= await askConfirm(prompt, "Add English/Arabic i18n", false, controller.signal);
      if (answers.starter === "blog" || answers.i18n) {
        answers.router = true;
      } else {
        answers.router ??= await askConfirm(
          prompt,
          "Add route examples",
          false,
          controller.signal
        );
      }

      const testingEnabled = answers.testing
        ? answers.testing !== "none"
        : await askConfirm(prompt, "Add testing", false, controller.signal);

      if (testingEnabled && !answers.testing) {
        answers.testing = await askSelect(
          prompt,
          "Testing",
          [["all", "Unit + E2E"], ["unit", "Unit only"], ["e2e", "E2E only"]],
          "all",
          controller.signal
        ) as ScaffoldTesting;
      }
      answers.testing ||= "none";
      answers.git ??= await askConfirm(prompt, "Initialize Git repository", true, controller.signal);
    }

    answers.install ??= await askConfirm(
      prompt,
      `Install dependencies with ${packageManager}`,
      true,
      controller.signal
    );
    answers.start = answers.install
      ? answers.start ?? await askConfirm(prompt, "Start the dev server", false, controller.signal)
      : false;

    return answers;
  } catch (error) {
    if (controller.signal.aborted || isAbortError(error)) {
      throw new Error("Operation cancelled.", { cause: error });
    }
    throw error;
  } finally {
    process.removeListener("SIGINT", onInterrupt);
    prompt.close();
  }
}

/** Performs the internal `askText()` operation. */
async function askText(
  prompt: ReturnType<typeof createInterface>,
  label: string,
  defaultValue: string,
  signal: AbortSignal
) {
  const answer = await prompt.question(`◆ ${label} (${defaultValue}): `, { signal });
  return answer.trim() || defaultValue;
}

/** Performs the internal `askConfirm()` operation. */
async function askConfirm(
  prompt: ReturnType<typeof createInterface>,
  label: string,
  defaultValue: boolean,
  signal: AbortSignal
) {
  const hint = defaultValue ? "Y/n" : "y/N";
  const answer = (await prompt.question(`◆ ${label}? (${hint}): `, { signal }))
    .trim()
    .toLowerCase();

  if (!answer) return defaultValue;
  if (answer === "y" || answer === "yes") return true;
  if (answer === "n" || answer === "no") return false;
  throw new Error(`Answer "${label}" with yes or no.`);
}

/** Performs the internal `askSelect()` operation. */
async function askSelect(
  prompt: ReturnType<typeof createInterface>,
  label: string,
  choices: ReadonlyArray<readonly [string, string]>,
  defaultValue: string,
  signal: AbortSignal
) {
  stdout.write(`◆ ${label}:\n`);
  choices.forEach(([value, text], index) => {
    const marker = value === defaultValue ? "●" : "○";
    stdout.write(`  ${index + 1}. ${marker} ${text}\n`);
  });
  const answer = (await prompt.question(`Select [${defaultValue}]: `, { signal })).trim();

  if (!answer) return defaultValue;
  const index = Number(answer) - 1;
  const byIndex = Number.isInteger(index) ? choices[index]?.[0] : undefined;
  const byValue = choices.find(([value]) => value === answer.toLowerCase())?.[0];

  if (!byIndex && !byValue) {
    throw new Error(`Unknown ${label.toLowerCase()} choice "${answer}".`);
  }

  return byIndex || byValue || defaultValue;
}

/** Evaluates the `isAbortError()` condition for the supplied input. */
function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
