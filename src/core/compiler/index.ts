/**
 * ----------------------------------------
 * Module: Template Compiler
 * ----------------------------------------
 *
 * Parses HTML start tags, normalizes VeloDom directives, validates template
 * expressions, emits diagnostics, and invokes optimizer extensions.
 * ----------------------------------------
 */

import {
  BINDING_DIRECTIVES,
  isPreferredDirective
} from "../shared/directives.ts";
import {
  ExpressionSyntaxError,
  parseExpression
} from "../expression/parser.ts";
import { runTemplateOptimizers } from "./optimizer.ts";
import type {
  CompilerOptions,
  DirectiveMetadata,
  TemplateAst
} from "./types.ts";

/** Public optimizer utilities exposed through the compiler package entry. */
export {
  createRuntimeFeatureManifest,
  defineTemplateOptimizer,
  runTemplateOptimizers
} from "./optimizer.ts";

/** Public compiler contracts exposed to build-tool integrations. */
export type {
  CompilerDiagnostic,
  CompilerMode,
  CompilerOptions,
  DirectiveMetadata,
  RuntimeFeatureManifest,
  SourceLocation,
  TemplateAst,
  TemplateCompileResult,
  TemplateOptimizer,
  TemplateOptimizerContext,
  TemplateOptimizerResult
} from "./types.ts";

const EXPRESSION_DIRECTIVES = new Set([
  "data-vd-alt",
  "data-vd-attr",
  "data-vd-checked",
  "data-vd-class",
  "data-vd-disabled",
  "data-vd-elseif",
  "data-vd-href",
  "data-vd-if",
  "data-vd-params",
  "data-vd-props",
  "data-vd-request-config",
  "data-vd-show",
  "data-vd-src",
  "data-vd-style",
  "data-vd-text",
  "data-vd-value"
]);

/**
 * Compiles one HTML template into normalized runtime HTML and metadata.
 */
export function compileTemplate(
  source: string,
  options: CompilerOptions = {}
) {
  if (typeof source !== "string") {
    throw new TypeError("VeloDom compiler expected template source to be a string");
  }

  const filename = options.filename || "template.html";
  const mode = options.mode || "development";
  const diagnostics = [];
  const metadata = [];
  const ast: TemplateAst = {
    type: "Template",
    filename,
    children: []
  };
  let output = "";
  let cursor = 0;

  while (cursor < source.length) {
    const open = source.indexOf("<", cursor);

    if (open === -1) {
      output += source.slice(cursor);
      break;
    }

    output += source.slice(cursor, open);

    if (source.startsWith("<!--", open)) {
      const commentEnd = source.indexOf("-->", open + 4);
      const end = commentEnd === -1
        ? source.length
        : commentEnd + 3;

      output += source.slice(open, end);
      cursor = end;
      continue;
    }

    if (
      source.startsWith("</", open)
      || source.startsWith("<!", open)
      || source.startsWith("<?", open)
    ) {
      const end = findTagEnd(source, open);

      if (end === -1) {
        output += source.slice(open);
        break;
      }

      output += source.slice(open, end + 1);
      cursor = end + 1;
      continue;
    }

    const end = findTagEnd(source, open);

    if (end === -1) {
      diagnostics.push(createDiagnostic(
        source,
        filename,
        open,
        "error",
        "VD_COMPILER_UNCLOSED_TAG",
        "Template contains an unclosed start tag"
      ));
      output += source.slice(open);
      break;
    }

    const tagSource = source.slice(open, end + 1);
    const compiledTag = compileStartTag(
      tagSource,
      open,
      source,
      filename
    );

    output += compiledTag.html;
    diagnostics.push(...compiledTag.diagnostics);
    metadata.push(...compiledTag.metadata);
    ast.children.push(compiledTag.ast);
    cursor = end + 1;

    if (compiledTag.ast.tagName === "script" || compiledTag.ast.tagName === "style") {
      const closeStart = source
        .toLowerCase()
        .indexOf(`</${compiledTag.ast.tagName}`, cursor);

      if (closeStart !== -1) {
        output += source.slice(cursor, closeStart);
        cursor = closeStart;
      }
    }
  }

  const result = runTemplateOptimizers({
    html: output,
    ast,
    metadata,
    diagnostics
  }, {
    filename,
    mode,
    source
  }, options.optimizers);

  if (mode !== "production") {
    return result;
  }

  return {
    ...result,
    metadata: result.metadata.map(
      stripDevelopmentMetadata
    ) as DirectiveMetadata[]
  };
}

function compileStartTag(tagSource, sourceOffset, fullSource, filename) {
  const parsed = parseStartTag(tagSource, sourceOffset);
  const diagnostics = [];
  const metadata = [];
  const replacements = [];

  parsed.attributes.forEach(attribute => {
    const compiled = compileDirectiveName(attribute.name);

    if (!compiled) return;

    if (compiled.error) {
      diagnostics.push(createDiagnostic(
        fullSource,
        filename,
        attribute.start,
        "error",
        compiled.code,
        compiled.error
      ));
      return;
    }

    const expression = getDirectiveExpression(
      compiled.name,
      attribute.value
    );

    if (expression !== null) {
      try {
        parseExpression(expression);
      } catch (error) {
        const syntaxError = error instanceof ExpressionSyntaxError
          ? error
          : new ExpressionSyntaxError(
            error?.message || "Invalid directive expression"
          );

        diagnostics.push(createDiagnostic(
          fullSource,
          filename,
          attribute.valueStart + syntaxError.offset,
          "error",
          syntaxError.code,
          syntaxError.message
        ));
      }
    }

    replacements.push({
      start: attribute.nameStart,
      end: attribute.nameEnd,
      value: compiled.name
    });
    metadata.push({
      type: compiled.type,
      name: compiled.name,
      originalName: attribute.name,
      argument: compiled.argument || "",
      modifiers: compiled.modifiers,
      expression: attribute.value,
      offset: attribute.start,
      location: getSourceLocation(fullSource, attribute.start)
    });
  });

  let html = tagSource;

  replacements
    .sort((a, b) => b.start - a.start)
    .forEach(replacement => {
      const localStart = replacement.start - sourceOffset;
      const localEnd = replacement.end - sourceOffset;

      html = (
        html.slice(0, localStart)
        + replacement.value
        + html.slice(localEnd)
      );
    });

  return {
    html,
    diagnostics,
    metadata,
    ast: {
      type: "ElementStart",
      tagName: parsed.tagName,
      selfClosing: parsed.selfClosing,
      offset: sourceOffset,
      attributes: parsed.attributes.map(attribute => ({
        type: "Attribute",
        name: attribute.name,
        value: attribute.value,
        offset: attribute.start
      }))
    }
  };
}

function compileDirectiveName(name) {
  if (name.startsWith("data-vd-")) {
    return {
      type: "legacy",
      name,
      modifiers: readModifiers(name)
    };
  }

  if (!name.startsWith("vd-")) {
    return null;
  }

  const directive = name.slice(3);

  if (directive.startsWith("on:")) {
    const eventWithModifiers = directive.slice(3);
    const [eventName, ...modifiers] = eventWithModifiers.split(".");

    if (!eventName) {
      return {
        code: "VD_COMPILER_EVENT_NAME",
        error: "vd-on requires an event name, for example vd-on:click"
      };
    }

    return {
      type: "event",
      name: `data-vd-on${eventName}${modifiers.length ? `.${modifiers.join(".")}` : ""}`,
      argument: eventName,
      modifiers
    };
  }

  if (directive.startsWith("bind:")) {
    const bindingName = directive.slice(5);

    if (!BINDING_DIRECTIVES.includes(bindingName)) {
      return {
        code: "VD_COMPILER_BINDING_NAME",
        error: `Unsupported vd-bind target "${bindingName}"`
      };
    }

    return {
      type: "binding",
      name: `data-vd-${bindingName}`,
      argument: bindingName,
      modifiers: []
    };
  }

  const [baseName] = directive.split(".");

  if (!isPreferredDirective(baseName)) {
    return {
      code: "VD_COMPILER_UNKNOWN_DIRECTIVE",
      error: `Unknown VeloDom directive "${name}"`
    };
  }

  return {
    type: "directive",
    name: `data-vd-${directive}`,
    modifiers: readModifiers(directive)
  };
}

function parseStartTag(tagSource, sourceOffset) {
  let index = 1;

  while (isWhitespace(tagSource[index])) index += 1;

  const tagStart = index;

  while (
    index < tagSource.length
    && !isWhitespace(tagSource[index])
    && tagSource[index] !== ">"
    && tagSource[index] !== "/"
  ) {
    index += 1;
  }

  const tagName = tagSource
    .slice(tagStart, index)
    .toLowerCase();
  const attributes = [];

  while (index < tagSource.length) {
    while (isWhitespace(tagSource[index])) index += 1;

    if (
      index >= tagSource.length
      || tagSource[index] === ">"
      || tagSource[index] === "/"
    ) {
      break;
    }

    const nameStart = index;

    while (
      index < tagSource.length
      && !isWhitespace(tagSource[index])
      && tagSource[index] !== "="
      && tagSource[index] !== ">"
      && tagSource[index] !== "/"
    ) {
      index += 1;
    }

    const nameEnd = index;
    const name = tagSource.slice(nameStart, nameEnd);

    while (isWhitespace(tagSource[index])) index += 1;

    let value = "";
    let valueStart = index;

    if (tagSource[index] === "=") {
      index += 1;
      while (isWhitespace(tagSource[index])) index += 1;

      const quote = tagSource[index];

      if (quote === '"' || quote === "'") {
        index += 1;
        valueStart = index;

        while (index < tagSource.length && tagSource[index] !== quote) {
          index += 1;
        }

        value = tagSource.slice(valueStart, index);
        if (tagSource[index] === quote) index += 1;
      } else {
        valueStart = index;

        while (
          index < tagSource.length
          && !isWhitespace(tagSource[index])
          && tagSource[index] !== ">"
        ) {
          index += 1;
        }

        value = tagSource.slice(valueStart, index);
      }
    }

    attributes.push({
      name,
      value,
      start: sourceOffset + nameStart,
      nameStart: sourceOffset + nameStart,
      nameEnd: sourceOffset + nameEnd,
      valueStart: sourceOffset + valueStart
    });
  }

  return {
    tagName,
    attributes,
    selfClosing: /\/\s*>$/.test(tagSource)
  };
}

function getDirectiveExpression(name, value) {
  if (name === "data-vd-for") {
    const match = String(value || "").match(
      /^\s*(?:\(\s*[\w$]+\s*,\s*[\w$]+\s*\)|[\w$]+)\s+in\s+(.+)\s*$/
    );

    return match
      ? match[1]
      : null;
  }

  if (name.startsWith("data-vd-on")) {
    return String(value || "");
  }

  return EXPRESSION_DIRECTIVES.has(name)
    ? String(value || "")
    : null;
}

function findTagEnd(source, start) {
  let quote = "";

  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (char === quote) quote = "";
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === ">") return index;
  }

  return -1;
}

function readModifiers(name) {
  return name
    .split(".")
    .slice(1)
    .filter(Boolean);
}

function isWhitespace(value) {
  return Boolean(value && /\s/.test(value));
}

function createDiagnostic(source, filename, offset, severity, code, message) {
  return {
    severity,
    code,
    message,
    filename,
    offset,
    location: getSourceLocation(source, offset)
  };
}

function getSourceLocation(source, offset) {
  const before = source.slice(0, offset);
  const lines = before.split("\n");

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

function stripDevelopmentMetadata(entry) {
  return {
    type: entry.type,
    name: entry.name,
    argument: entry.argument,
    modifiers: entry.modifiers,
    expression: entry.expression
  };
}
