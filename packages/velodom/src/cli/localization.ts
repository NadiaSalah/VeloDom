/**
 * ----------------------------------------
 * Module: Localization Intelligence
 * ----------------------------------------
 *
 * Extracts quoted translation-key usage and checks a static application-owned
 * localization object without importing or executing project modules.
 * ----------------------------------------
 */

import { join } from "node:path";
import { evaluateExpression } from "../expression/index.ts";
import {
  extractLocaleKeyUsage,
  inspectLocalization,
  type LocalizationOptions
} from "../localization.ts";
import {
  discoverFiles,
  readOptionalText
} from "./analyzer.ts";
import type { CliContext } from "./types.ts";

/** Runs static localization extraction or validation for the current project. */
export async function runLocalizationCommand(
  context: CliContext,
  action: string,
  json: boolean
): Promise<number> {
  const sources = await readLocalizationProjectSources(context.cwd);
  const usedKeys = extractLocaleKeyUsage(sources.map(item => item.source));

  if (action === "extract") {
    if (json) context.stdout(JSON.stringify({ keys: usedKeys }, null, 2));
    else {
      context.stdout("VeloDom statically quoted localization keys");
      context.stdout("===========================================");
      usedKeys.forEach(key => context.stdout(`  ${key}`));
      if (usedKeys.length === 0) context.stdout("  No statically quoted keys found.");
    }
    return 0;
  }

  if (action !== "check") {
    throw new Error("vd i18n requires extract or check.");
  }

  const config = sources.find(item => isLocalizationConfig(item.path));

  if (!config) {
    throw new Error(
      "vd i18n check requires src/i18n.js|ts or src/localization.js|ts with a static localizationOptions object."
    );
  }

  const options = readStaticLocalizationOptions(config.source, config.path);
  const diagnostics = inspectLocalization(options, usedKeys);

  if (json) {
    context.stdout(JSON.stringify({
      config: config.path,
      diagnostics,
      usedKeys
    }, null, 2));
  } else {
    context.stdout(`VeloDom localization check (${config.path})`);
    context.stdout("=".repeat(31 + config.path.length));
    diagnostics.forEach(item => context.stdout(
      `  ${item.severity === "error" ? "error" : "warn"} [${item.code}] ${item.message}`
    ));
    if (diagnostics.length === 0) context.stdout("  ✓ dictionaries and quoted usage agree");
  }

  return diagnostics.some(item => item.severity === "error") ? 1 : 0;
}

/** Reads source files once for extraction and static config selection. */
async function readLocalizationProjectSources(root: string) {
  const files = await discoverFiles(root, "src", [".html", ".vd", ".js", ".mjs", ".ts"]);

  return await Promise.all(files.map(async path => ({
    path,
    source: await readOptionalText(join(root, path))
  })));
}

/** Recognizes supported application-owned localization config filenames. */
function isLocalizationConfig(path: string) {
  return /^src\/(?:i18n|localization)\.(?:js|ts|mjs)$/.test(path);
}

/** Evaluates only a balanced object expression through VeloDom's safe parser. */
function readStaticLocalizationOptions(
  source: string,
  filename: string
): LocalizationOptions {
  const marker = /\blocalizationOptions\s*=\s*/g.exec(source);

  if (!marker) {
    throw new Error(`${filename} must export a static localizationOptions object.`);
  }

  const start = marker.index + marker[0].length;
  const expression = source[start] === "{" ? extractBalancedObject(source, start) : "";

  if (!expression) {
    throw new Error(`${filename} contains an unreadable localizationOptions object.`);
  }

  try {
    const value = evaluateExpression(expression, {
      state: {
        defineLocaleDictionary: (dictionary: unknown) => dictionary,
        definePluralMessage: (forms: unknown) => ({ $plural: forms })
      }
    });

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("localizationOptions is not an object");
    }
    return value as LocalizationOptions;
  } catch (error) {
    throw new Error(
      `${filename} localizationOptions must use static strings, objects, booleans, defineLocaleDictionary(), and definePluralMessage().`,
      { cause: error }
    );
  }
}

/** Finds a closing object brace while skipping strings and source comments. */
function extractBalancedObject(source: string, start: number): string {
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index] || "";
    const next = source[index + 1] || "";

    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "\"" || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  return "";
}
