/**
 * ----------------------------------------
 * Module: Directive Contracts
 * ----------------------------------------
 *
 * Defines compiler-facing directive names and binding targets shared across
 * parsing, validation, and runtime normalization.
 * ----------------------------------------
 */

/** Preferred HTML-first directive names accepted by the compiler. */
export const PREFERRED_DIRECTIVES = Object.freeze([
  "alt",
  "attr",
  "checked",
  "child",
  "class",
  "component",
  "disabled",
  "else",
  "elseif",
  "for",
  "get-child",
  "href",
  "if",
  "key",
  "loading",
  "model",
  "nav",
  "params",
  "path",
  "prop-",
  "props",
  "ref",
  "request",
  "request-config",
  "request-state",
  "show",
  "src",
  "state",
  "style",
  "target",
  "text",
  "value",
  "error"
]);

/** Attribute-style bindings supported by vd-bind. */
export const BINDING_DIRECTIVES = Object.freeze([
  "alt",
  "attr",
  "checked",
  "class",
  "disabled",
  "href",
  "src",
  "style",
  "value"
]);

/** Returns whether a directive uses a supported preferred name. */
export function isPreferredDirective(name: string) {
  return PREFERRED_DIRECTIVES.some(directive => (
    directive.endsWith("-")
      ? name.startsWith(directive)
      : name === directive
  ));
}
