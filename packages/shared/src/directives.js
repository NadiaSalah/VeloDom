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

export function isPreferredDirective(name) {
  return PREFERRED_DIRECTIVES.some(directive => (
    directive.endsWith("-")
      ? name.startsWith(directive)
      : name === directive
  ));
}
