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
import { VD, VD_ACCESSIBILITY, VD_SECURITY } from "../constants.ts";
import {
  ExpressionSyntaxError,
  parseExpression
} from "../expression/parser.ts";
import { runTemplateOptimizers } from "./optimizer.ts";
import type {
  CompilerDiagnostic,
  CompilerOptions,
  DirectiveMetadata,
  SourceLocation,
  TemplateCompileResult,
  TemplateAst
} from "./types.ts";

interface ParsedAttribute {
  name: string;
  value: string;
  start: number;
  nameStart: number;
  nameEnd: number;
  valueStart: number;
}

interface ParsedStartTag {
  tagName: string;
  attributes: ParsedAttribute[];
  offset: number;
  selfClosing: boolean;
}

interface ElementAttributeAst extends Record<string, unknown> {
  type: "Attribute";
  name: string;
  value: string;
  offset: number;
}

interface ElementStartAst extends Record<string, unknown> {
  type: "ElementStart";
  tagName: string;
  selfClosing: boolean;
  offset: number;
  attributes: ElementAttributeAst[];
  preserveText: boolean;
}

interface AccessibilityContext {
  labelTargets: Set<string>;
  lastHeadingLevel: number;
}

interface DirectiveCompileSuccess {
  type: "legacy" | "event" | "binding" | "directive";
  name: string;
  argument?: string;
  modifiers: string[];
}

interface DirectiveCompileFailure {
  code: string;
  error: string;
}

type CompiledDirectiveName =
  | DirectiveCompileSuccess
  | DirectiveCompileFailure
  | null;

interface AttributeReplacement {
  start: number;
  end: number;
  value: string;
}

interface CompiledStartTag {
  html: string;
  diagnostics: CompilerDiagnostic[];
  metadata: DirectiveMetadata[];
  ast: ElementStartAst;
}

interface CompiledTextSegment {
  html: string;
  diagnostics: CompilerDiagnostic[];
  metadata: DirectiveMetadata[];
}

type AttributeLookup = Map<string, ParsedAttribute>;

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

/** Optional compiler-backed language-service helpers for editor integrations. */
export {
  analyzeVeloDomDocument,
  getVeloDomDirectiveCompletions
} from "../language-service.ts";

/** Public editor-integration contracts. */
export type {
  VeloDomDirectiveCompletion,
  VeloDomLanguageAnalysis,
  VeloDomLanguageDocument
} from "../language-service.ts";

const EXPRESSION_DIRECTIVES = new Set([
  "data-vd-alt",
  "data-vd-attr",
  "data-vd-checked",
  "data-vd-class",
  "data-vd-debounce",
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
  "data-vd-throttle",
  "data-vd-value"
]);

/**
 * Compiles one HTML template into normalized runtime HTML and metadata.
 */
export function compileTemplate(
  source: string,
  options: CompilerOptions = {}
): TemplateCompileResult {
  if (typeof source !== "string") {
    throw new TypeError("VeloDom compiler expected template source to be a string");
  }

  const filename = options.filename || "template.html";
  const mode = options.mode || "development";
  const diagnostics: CompilerDiagnostic[] = [];
  const metadata: DirectiveMetadata[] = [];
  const ast: TemplateAst = {
    type: "Template",
    filename,
    children: []
  };
  const accessibilityContext = createAccessibilityContext(source);
  diagnostics.push(...createSecurityDiagnostics(source, filename));
  let output = "";
  let cursor = 0;

  while (cursor < source.length) {
    const open = source.indexOf("<", cursor);

    if (open === -1) {
      const compiledText = compileTextSegment(
        source.slice(cursor),
        cursor,
        source,
        filename
      );

      output += compiledText.html;
      diagnostics.push(...compiledText.diagnostics);
      metadata.push(...compiledText.metadata);
      break;
    }

    const compiledText = compileTextSegment(
      source.slice(cursor, open),
      cursor,
      source,
      filename
    );

    output += compiledText.html;
    diagnostics.push(...compiledText.diagnostics);
    metadata.push(...compiledText.metadata);

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
      filename,
      accessibilityContext
    );

    output += compiledTag.html;
    diagnostics.push(...compiledTag.diagnostics);
    metadata.push(...compiledTag.metadata);
    ast.children.push(compiledTag.ast);
    cursor = end + 1;

    if (shouldPreserveTextContent(compiledTag.ast)) {
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

/** Compiles the start tag. */
function compileStartTag(
  tagSource: string,
  sourceOffset: number,
  fullSource: string,
  filename: string,
  accessibilityContext: AccessibilityContext
): CompiledStartTag {
  const parsed = parseStartTag(tagSource, sourceOffset);
  const diagnostics: CompilerDiagnostic[] = [];
  const metadata: DirectiveMetadata[] = [];
  const replacements: AttributeReplacement[] = [];

  diagnostics.push(...createAccessibilityDiagnostics(
    parsed,
    fullSource,
    filename,
    accessibilityContext
  ));

  parsed.attributes.forEach(attribute => {
    const compiled = compileDirectiveName(attribute.name);

    if (!compiled) return;

    if ("error" in compiled) {
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
            getErrorMessage(error, "Invalid directive expression")
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
      })),
      preserveText: hasPreservedTextAttribute(parsed.attributes)
    }
  };
}

/** Compiles the text segment. */
function compileTextSegment(
  text: string,
  sourceOffset: number,
  fullSource: string,
  filename: string
): CompiledTextSegment {
  const diagnostics: CompilerDiagnostic[] = [];
  const metadata: DirectiveMetadata[] = [];
  let html = "";
  let cursor = 0;
  const pattern = /(\\)?{{([\s\S]*?)}}/g;
  let match = pattern.exec(text);

  while (match) {
    if (match[1]) {
      html += text.slice(cursor, match.index);
      html += match[0].slice(1);
      cursor = match.index + match[0].length;
      match = pattern.exec(text);
      continue;
    }

    const expressionSource = match[2] || "";
    const expression = expressionSource.trim();
    const interpolationStart = sourceOffset + match.index;
    const expressionOffset = interpolationStart
      + 2
      + expressionSource.indexOf(expression);

    html += text.slice(cursor, match.index);

    if (!expression) {
      diagnostics.push(createDiagnostic(
        fullSource,
        filename,
        interpolationStart,
        "error",
        "VD_COMPILER_EMPTY_INTERPOLATION",
        "Text interpolation requires an expression"
      ));
      html += match[0];
    } else {
      try {
        parseExpression(expression);
      } catch (error) {
        const syntaxError = error instanceof ExpressionSyntaxError
          ? error
          : new ExpressionSyntaxError(
            getErrorMessage(error, "Invalid text interpolation expression")
          );

        diagnostics.push(createDiagnostic(
          fullSource,
          filename,
          expressionOffset + syntaxError.offset,
          "error",
          syntaxError.code,
          syntaxError.message
        ));
      }

      html += `<span ${VD.TEXT}="${escapeAttribute(expression)}"></span>`;
      metadata.push({
        type: "interpolation",
        name: VD.TEXT,
        originalName: "{{ }}",
        argument: "",
        modifiers: [],
        expression,
        offset: interpolationStart,
        location: getSourceLocation(fullSource, interpolationStart)
      });
    }

    cursor = match.index + match[0].length;
    match = pattern.exec(text);
  }

  html += text.slice(cursor);

  return {
    html,
    diagnostics,
    metadata
  };
}

/** Evaluates the `shouldPreserveTextContent()` condition for the supplied input. */
function shouldPreserveTextContent(ast: ElementStartAst): boolean {
  return (
    !ast.selfClosing
    && (ast.tagName === "script"
    || ast.tagName === "style"
    || ast.preserveText)
  );
}

/** Evaluates the `hasPreservedTextAttribute()` condition for the supplied input. */
function hasPreservedTextAttribute(attributes: ParsedAttribute[]): boolean {
  return attributes.some(attribute => (
    attribute.name === "vd-pre"
    || attribute.name === VD.PRE
  ));
}

/** Compiles the directive name. */
function compileDirectiveName(name: string): CompiledDirectiveName {
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

  const baseName = directive.split(".")[0] || "";

  if (!isPreferredDirective(baseName)) {
    return {
      code: "VD_COMPILER_UNKNOWN_DIRECTIVE",
      error: `Unknown VeloDom directive "${name}"`
    };
  }

  return {
    type: "directive",
    name: `data-vd-${normalizeDirectiveAlias(directive)}`,
    modifiers: readModifiers(directive)
  };
}

/** Normalizes the directive alias. */
function normalizeDirectiveAlias(directive: string) {
  if (directive === "auto-state") return "request-state";

  if (directive.startsWith("auto-state.")) {
    return `request-state${directive.slice("auto-state".length)}`;
  }

  return directive;
}

/** Parses the start tag. */
function parseStartTag(tagSource: string, sourceOffset: number): ParsedStartTag {
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
  const attributes: ParsedAttribute[] = [];

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
    offset: sourceOffset,
    selfClosing: /\/\s*>$/.test(tagSource)
  };
}

/** Creates the accessibility context. */
function createAccessibilityContext(source: string): AccessibilityContext {
  return {
    labelTargets: collectLabelTargets(source),
    lastHeadingLevel: 0
  };
}

/** Creates the accessibility diagnostics. */
function createAccessibilityDiagnostics(
  parsed: ParsedStartTag,
  source: string,
  filename: string,
  context: AccessibilityContext
): CompilerDiagnostic[] {
  const tagName = parsed.tagName;
  const attributes = createAttributeLookup(parsed.attributes);
  const diagnostics: CompilerDiagnostic[] = [];

  if (tagName === "img" && !hasAnyAttribute(attributes, [
    "alt",
    "data-vd-alt",
    "vd-alt",
    "vd-bind:alt"
  ])) {
    diagnostics.push(createDiagnostic(
      source,
      filename,
      parsed.offset,
      "warning",
      VD_ACCESSIBILITY.CODES.IMG_ALT,
      "Image elements should provide static or bound alt text"
    ));
  }

  if (
    tagName === "img"
    && hasAnyAttribute(attributes, ["src", "data-vd-src", "vd-src", "vd-bind:src"])
    && !hasAnyAttribute(attributes, ["width", "data-vd-width", "vd-width", "vd-bind:width"])
    && !hasAnyAttribute(attributes, ["height", "data-vd-height", "vd-height", "vd-bind:height"])
  ) {
    diagnostics.push(createDiagnostic(
      source,
      filename,
      parsed.offset,
      "warning",
      VD_ACCESSIBILITY.CODES.IMG_DIMENSIONS,
      "Images should provide width and height to reduce layout shift"
    ));
  }

  if (isFormControl(tagName, attributes) && !hasAccessibleName(attributes, context)) {
    diagnostics.push(createDiagnostic(
      source,
      filename,
      parsed.offset,
      "warning",
      VD_ACCESSIBILITY.CODES.CONTROL_NAME,
      "Form controls should have a label, aria-label, aria-labelledby, or title"
    ));
  }

  if (tagName === "a" && isInteractiveAnchor(attributes) && !hasAnyAttribute(attributes, [
    "href",
    "data-vd-href",
    "vd-href",
    "vd-bind:href"
  ])) {
    diagnostics.push(createDiagnostic(
      source,
      filename,
      parsed.offset,
      "warning",
      VD_ACCESSIBILITY.CODES.ANCHOR_HREF,
      "Interactive anchors should provide static or bound href values"
    ));
  }

  if (hasClickHandler(attributes) && isNonSemanticClickTarget(tagName, attributes)) {
    diagnostics.push(createDiagnostic(
      source,
      filename,
      parsed.offset,
      "warning",
      VD_ACCESSIBILITY.CODES.NON_SEMANTIC_CLICK,
      "Click handlers on non-interactive elements need a semantic role, focus, and keyboard support"
    ));
  }

  const headingLevel = getHeadingLevel(tagName);

  if (headingLevel) {
    if (
      context.lastHeadingLevel
      && headingLevel > context.lastHeadingLevel + 1
    ) {
      diagnostics.push(createDiagnostic(
        source,
        filename,
        parsed.offset,
        "warning",
        VD_ACCESSIBILITY.CODES.HEADING_ORDER,
        "Heading levels should not skip levels"
      ));
    }

    context.lastHeadingLevel = headingLevel;
  }

  return diagnostics;
}

/** Creates the security diagnostics. */
function createSecurityDiagnostics(
  source: string,
  filename: string
): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];

  for (const match of source.matchAll(/\bhref\s*=\s*(["'])\s*javascript:/gi)) {
    diagnostics.push(createDiagnostic(
      source,
      filename,
      match.index || 0,
      "error",
      VD_SECURITY.CODES.JAVASCRIPT_URL,
      "javascript: URLs are blocked because they execute injected script"
    ));
  }

  for (const match of source.matchAll(/<a\b[^>]*\btarget\s*=\s*(["'])_blank\1[^>]*>/gi)) {
    if (/\brel\s*=\s*(["'])[^"']*\bnoopener\b/i.test(match[0])) continue;

    diagnostics.push(createDiagnostic(
      source,
      filename,
      match.index || 0,
      "warning",
      VD_SECURITY.CODES.TARGET_NOOPENER,
      "Links opened in a new tab should include rel=\"noopener\""
    ));
  }

  for (const match of source.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const attributes = match[1] || "";
    const body = match[2] || "";
    const method = attributes.match(/\bmethod\s*=\s*(["'])(.*?)\1/i)?.[2]
      ?.trim()
      .toLowerCase() || "get";

    if (method === "post" || !/type\s*=\s*(["'])password\1/i.test(body)) {
      continue;
    }

    diagnostics.push(createDiagnostic(
      source,
      filename,
      match.index || 0,
      "error",
      VD_SECURITY.CODES.PASSWORD_GET,
      "Forms containing password fields must use method=\"post\" to avoid URL exposure"
    ));
  }

  for (const match of source.matchAll(/import\.meta\.env\.(VITE_[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY)[A-Z0-9_]*)/g)) {
    diagnostics.push(createDiagnostic(
      source,
      filename,
      match.index || 0,
      "warning",
      VD_SECURITY.CODES.ENV_SECRET,
      `${match[1]} is exposed to browser code; keep secrets on the server`
    ));
  }

  return diagnostics;
}

/** Collects the label targets. */
function collectLabelTargets(source: string): Set<string> {
  const targets = new Set<string>();
  const pattern = /<label\b[^>]*\bfor\s*=\s*(["'])(.*?)\1/gi;
  let match = pattern.exec(source);

  while (match) {
    if (match[2]) targets.add(match[2]);
    match = pattern.exec(source);
  }

  return targets;
}

/** Creates the attribute lookup. */
function createAttributeLookup(attributes: ParsedAttribute[]): AttributeLookup {
  const lookup: AttributeLookup = new Map();

  attributes.forEach(attribute => {
    lookup.set(attribute.name.toLowerCase(), attribute);
  });

  return lookup;
}

/** Evaluates the `hasAnyAttribute()` condition for the supplied input. */
function hasAnyAttribute(
  attributes: AttributeLookup,
  names: string[]
): boolean {
  return names.some(name => attributes.has(name));
}

/** Returns the attribute value. */
function getAttributeValue(attributes: AttributeLookup, name: string): string {
  return attributes.get(name)?.value || "";
}

/** Evaluates the `isFormControl()` condition for the supplied input. */
function isFormControl(tagName: string, attributes: AttributeLookup): boolean {
  if (!VD_ACCESSIBILITY.FORM_CONTROL_TAGS.includes(tagName)) {
    return false;
  }

  return !(
    tagName === "input"
    && getAttributeValue(attributes, "type").toLowerCase() === "hidden"
  );
}

/** Evaluates the `hasAccessibleName()` condition for the supplied input. */
function hasAccessibleName(
  attributes: AttributeLookup,
  context: AccessibilityContext
): boolean {
  if (hasAnyAttribute(attributes, [
    "aria-label",
    "aria-labelledby",
    "title"
  ])) {
    return true;
  }

  const id = getAttributeValue(attributes, "id");

  return Boolean(id && context.labelTargets.has(id));
}

/** Evaluates the `isInteractiveAnchor()` condition for the supplied input. */
function isInteractiveAnchor(attributes: AttributeLookup): boolean {
  return (
    hasAnyAttribute(attributes, [
      "data-vd-nav",
      "vd-nav"
    ])
    || hasClickHandler(attributes)
  );
}

/** Evaluates the `hasClickHandler()` condition for the supplied input. */
function hasClickHandler(attributes: AttributeLookup): boolean {
  for (const name of attributes.keys()) {
    if (
      name === "data-vd-onclick"
      || name === "vd-on:click"
      || name.startsWith("data-vd-onclick.")
      || name.startsWith("vd-on:click.")
    ) {
      return true;
    }
  }

  return false;
}

/** Evaluates the `isNonSemanticClickTarget()` condition for the supplied input. */
function isNonSemanticClickTarget(
  tagName: string,
  attributes: AttributeLookup
): boolean {
  if (VD_ACCESSIBILITY.INTERACTIVE_TAGS.includes(tagName)) {
    return false;
  }

  const role = getAttributeValue(attributes, "role").toLowerCase();
  const hasValidRole = Boolean(
    role && !VD_ACCESSIBILITY.PRESENTATIONAL_ROLES.includes(role)
  );

  return !(
    hasValidRole
    && attributes.has("tabindex")
    && hasKeyboardHandler(attributes)
  );
}

/** Evaluates the `hasKeyboardHandler()` condition for the supplied input. */
function hasKeyboardHandler(attributes: AttributeLookup): boolean {
  for (const name of attributes.keys()) {
    if (
      VD_ACCESSIBILITY.KEYBOARD_EVENT_PREFIXES.some(prefix => (
        name === prefix || name.startsWith(`${prefix}.`)
      ))
    ) {
      return true;
    }
  }

  return false;
}

/** Returns the heading level. */
function getHeadingLevel(tagName: string): number {
  if (!VD_ACCESSIBILITY.HEADING_TAGS.includes(tagName)) {
    return 0;
  }

  return Number(tagName.slice(1));
}

/** Returns the directive expression. */
function getDirectiveExpression(name: string, value: string): string | null {
  if (name === "data-vd-for") {
    const match = String(value || "").match(
      /^\s*(?:\(\s*[\w$]+\s*,\s*[\w$]+\s*\)|[\w$]+)\s+in\s+(.+)\s*$/
    );

    return match?.[1] || null;
  }

  if (name.startsWith("data-vd-on")) {
    return String(value || "");
  }

  return EXPRESSION_DIRECTIVES.has(name)
    ? String(value || "")
    : null;
}

/** Finds the tag end. */
function findTagEnd(source: string, start: number): number {
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

/** Reads the modifiers. */
function readModifiers(name: string): string[] {
  return name
    .split(".")
    .slice(1)
    .filter(Boolean);
}

/** Evaluates the `isWhitespace()` condition for the supplied input. */
function isWhitespace(value: string | undefined): boolean {
  return Boolean(value && /\s/.test(value));
}

/** Escapes the attribute. */
function escapeAttribute(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Creates the diagnostic. */
function createDiagnostic(
  source: string,
  filename: string,
  offset: number,
  severity: CompilerDiagnostic["severity"],
  code: string,
  message: string
): CompilerDiagnostic {
  return {
    severity,
    code,
    message,
    filename,
    offset,
    location: getSourceLocation(source, offset)
  };
}

/** Returns the source location. */
function getSourceLocation(source: string, offset: number): SourceLocation {
  const before = source.slice(0, offset);
  const lines = before.split("\n");

  return {
    line: lines.length,
    column: (lines.at(-1) || "").length + 1
  };
}

/** Strips the development metadata. */
function stripDevelopmentMetadata(entry: DirectiveMetadata): DirectiveMetadata {
  return {
    type: entry.type,
    name: entry.name,
    argument: entry.argument,
    modifiers: entry.modifiers,
    expression: entry.expression
  };
}

/** Returns a stable message for thrown values without assuming Error shape. */
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
