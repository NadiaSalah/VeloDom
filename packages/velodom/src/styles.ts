/**
 * ----------------------------------------
 * Module: Scoped Folder Styles
 * ----------------------------------------
 *
 * Loads page/component CSS resources and rewrites selectors under a generated
 * scope attribute while preserving nested at-rules.
 * ----------------------------------------
 */

import { VD } from "./constants.ts";
import { reportUserActionError } from "./errors/error-reporter.ts";

let scopeIndex = 0;

/** Loads and scopes every stylesheet belonging to one resource folder. */
export async function applyScopedFolderStyles(
  root,
  styleModules: Record<string, () => string | Promise<string>>,
  folderPrefix
) {
  const entries = Object.entries(styleModules)
    .filter(([filePath]) => filePath.startsWith(folderPrefix))
    .sort(([a], [b]) => a.localeCompare(b));

  if (!entries.length) return;

  const scopeId = `vd-scope-${++scopeIndex}`;
  const scopeSelector = `[${VD.SCOPE}="${scopeId}"]`;

  root.setAttribute(VD.SCOPE, scopeId);

  let cssChunks;
  try {
    cssChunks = await Promise.all(
      entries.map(([, load]) => load())
    );
  } catch (err) {
    reportUserActionError(err, {
      title: "Style Load Error",
      file: "velodom/styles.ts",
      line: 16,
      hint: "Check CSS file names and syntax in page/component folders."
    });

    return;
  }

  const style = document.createElement("style");
  style.textContent = cssChunks
    .map((css, index) => scopeCss(css, scopeSelector, entries[index][0]))
    .join("\n");

  root.prepend(style);
}

/** Scopes one CSS string while preserving explicit :global(...) selectors. */
export function scopeCss(css, scopeSelector, sourceFile = "") {
  return scopeCssBlock(css, scopeSelector, sourceFile);
}

function scopeCssBlock(content, scopeSelector, sourceFile) {
  let index = 0;
  let output = "";

  while (index < content.length) {
    const open = content.indexOf("{", index);

    if (open === -1) {
      output += content.slice(index);
      break;
    }

    const selector = content.slice(index, open).trim();
    const close = findMatchingBrace(content, open);

    if (close === -1) {
      reportUserActionError("Unmatched CSS brace", {
        title: "Invalid Scoped CSS",
        file: sourceFile || "velodom/styles.ts",
        line: 47,
        hint: "Make sure every '{' has a matching '}'."
      });

      output += content.slice(index);
      break;
    }

    const body = content.slice(open + 1, close);

    if (selector.startsWith("@")) {
      if (isNestedAtRule(selector)) {
        output += `${selector} {${scopeCssBlock(body, scopeSelector, sourceFile)}}`;
      } else {
        output += `${selector} {${body}}`;
      }
    } else {
      output += `${scopeSelectorList(selector, scopeSelector)} {${body}}`;
    }

    index = close + 1;
  }

  return output;
}

function findMatchingBrace(text, openIndex) {
  let depth = 0;

  for (let i = openIndex; i < text.length; i += 1) {
    const char = text[i];

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) return i;
  }

  return -1;
}

function isNestedAtRule(selector) {
  return /@media|@supports|@container|@layer/i.test(selector);
}

function scopeSelectorList(selectorList, scopeSelector) {
  return selectorList
    .split(",")
    .map(selector => scopeSingleSelector(selector.trim(), scopeSelector))
    .join(", ");
}

function scopeSingleSelector(selector, scopeSelector) {
  if (!selector) return scopeSelector;

  if (selector.includes(":global(")) {
    return scopeSelectorWithGlobal(selector, scopeSelector);
  }

  if (selector.includes(":scope")) {
    return selector.replaceAll(":scope", scopeSelector);
  }

  if (selector.startsWith(scopeSelector)) {
    return selector;
  }

  if (/^[>+~]/.test(selector)) {
    return `${scopeSelector}${selector}`;
  }

  return `${scopeSelector} ${selector}`;
}

function scopeSelectorWithGlobal(selector, scopeSelector) {
  const leadingGlobal = selector.match(/^:global\(([^)]*)\)(.*)$/);

  if (leadingGlobal) {
    const globalSelector = leadingGlobal[1].trim();
    const rest = replaceGlobalSelectors(leadingGlobal[2]).trim();

    if (!rest) return globalSelector;
    if (/^[>+~]/.test(rest)) return `${globalSelector} ${scopeSelector}${rest}`;

    return `${globalSelector} ${scopeSelector} ${rest}`;
  }

  return scopeSingleSelector(
    replaceGlobalSelectors(selector),
    scopeSelector
  );
}

function replaceGlobalSelectors(selector) {
  return selector.replace(/:global\(([^)]*)\)/g, "$1");
}
