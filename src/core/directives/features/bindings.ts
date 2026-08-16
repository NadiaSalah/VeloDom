/**
 * ----------------------------------------
 * Module: Binding Directives
 * ----------------------------------------
 *
 * Applies reactive attribute, value, boolean, class, style, and generic
 * attribute bindings while respecting inactive conditional branches.
 * ----------------------------------------
 */

import { VD } from "../../constants.ts";
import { evaluate } from "../expression.ts";
import {
  findAll,
  isConditionallyInactive,
  isInsideForTemplate
} from "../runtime.ts";
import type {
  DirectiveFeatureRuntime,
  DirectiveRuntimeContext,
  DirectiveState
} from "../runtime.ts";

/** Applies every normalized binding directive in one runtime subtree. */
export function applyBindings(runtime: DirectiveFeatureRuntime) {
  const {
    root,
    state,
    cleanups,
    context
  } = runtime;

  applyAttributeBinding(root, state, cleanups, context, VD.SRC, "src");
  applyAttributeBinding(root, state, cleanups, context, VD.HREF, "href");
  applyAttributeBinding(root, state, cleanups, context, VD.ALT, "alt");
  applyValueBinding(runtime);
  applyBooleanBinding(runtime, VD.DISABLED, "disabled");
  applyBooleanBinding(runtime, VD.CHECKED, "checked");
  applyClassBinding(runtime);
  applyStyleBinding(runtime);
  applyAttrBinding(runtime);
}

function applyAttributeBinding(
  root,
  state: DirectiveState,
  cleanups,
  context: DirectiveRuntimeContext,
  directive: string,
  attrName: string
) {
  findAll(root, directive).forEach(el => {
    if (isInsideForTemplate(el, VD.FOR)) return;

    const expression = el.getAttribute(directive);
    const update = () => {
      if (isConditionallyInactive(el)) return;

      const value = evaluate(expression, state, null, el, context.props, {
        directive
      });

      if (value === null || value === undefined || value === false) {
        removeAttributeIfPresent(el, attrName);
        return;
      }

      setAttributeIfChanged(el, attrName, String(value));
    };

    update();
    cleanups.push(state._subscribe(update));
  });
}

function applyValueBinding({
  root,
  state,
  cleanups,
  context
}: DirectiveFeatureRuntime) {
  findAll(root, VD.VALUE).forEach(el => {
    if (isInsideForTemplate(el, VD.FOR)) return;

    const expression = el.getAttribute(VD.VALUE);
    const update = () => {
      if (isConditionallyInactive(el)) return;

      const value = evaluate(expression, state, null, el, context.props, {
        directive: VD.VALUE
      });
      const input = el as HTMLInputElement;
      const nextValue = String(value ?? "");

      if (input.value !== nextValue) {
        input.value = nextValue;
      }

      setAttributeIfChanged(input, "value", nextValue);
    };

    update();
    cleanups.push(state._subscribe(update));
  });
}

function applyBooleanBinding(
  runtime: DirectiveFeatureRuntime,
  directive: string,
  attrName: "checked" | "disabled"
) {
  const {
    root,
    state,
    cleanups,
    context
  } = runtime;

  findAll(root, directive).forEach(el => {
    if (isInsideForTemplate(el, VD.FOR)) return;

    const expression = el.getAttribute(directive);
    const update = () => {
      if (isConditionallyInactive(el)) return;

      const value = Boolean(
        evaluate(expression, state, null, el, context.props, {
          directive
        })
      );
      const input = el as HTMLInputElement;

      if (input[attrName] !== value) {
        input[attrName] = value;
      }

      if (value) {
        setAttributeIfChanged(input, attrName, "");
      } else {
        removeAttributeIfPresent(input, attrName);
      }
    };

    update();
    cleanups.push(state._subscribe(update));
  });
}

function applyClassBinding(runtime: DirectiveFeatureRuntime) {
  const {
    root,
    state,
    cleanups,
    context
  } = runtime;

  findAll(root, VD.CLASS).forEach(el => {
    if (isInsideForTemplate(el, VD.FOR)) return;

    const expression = el.getAttribute(VD.CLASS);
    let applied = new Set<string>();
    const update = () => {
      if (isConditionallyInactive(el)) return;

      const next = normalizeClassValue(
        evaluate(expression, state, null, el, context.props, {
          directive: VD.CLASS
        })
      );

      applied.forEach(name => {
        if (!next.has(name)) {
          el.classList.remove(name);
        }
      });
      next.forEach(name => {
        if (!applied.has(name)) {
          el.classList.add(name);
        }
      });
      applied = next;
    };

    update();
    cleanups.push(state._subscribe(update));
  });
}

function applyStyleBinding(runtime: DirectiveFeatureRuntime) {
  const {
    root,
    state,
    cleanups,
    context
  } = runtime;

  findAll(root, VD.STYLE).forEach(el => {
    if (isInsideForTemplate(el, VD.FOR)) return;

    const expression = el.getAttribute(VD.STYLE);
    let appliedKeys: string[] = [];
    const update = () => {
      if (isConditionallyInactive(el)) return;

      const value = evaluate(
        expression,
        state,
        null,
        el,
        context.props,
        {
          directive: VD.STYLE
        }
      );
      const style = (el as HTMLElement).style;

      if (typeof value === "string") {
        if (style.cssText !== value) {
          style.cssText = value;
        }
        appliedKeys = [];
        return;
      }

      if (!value || typeof value !== "object") {
        removeAttributeIfPresent(el, "style");
        appliedKeys = [];
        return;
      }

      const styles = value as Record<string, unknown>;

      appliedKeys.forEach(key => {
        if (!(key in styles)) {
          removeStyleProperty(style, key);
        }
      });

      Object.entries(styles).forEach(([key, styleValue]) => {
        setStylePropertyIfChanged(style, key, String(styleValue ?? ""));
      });

      appliedKeys = Object.keys(styles);
    };

    update();
    cleanups.push(state._subscribe(update));
  });
}

function applyAttrBinding(runtime: DirectiveFeatureRuntime) {
  const {
    root,
    state,
    cleanups,
    context
  } = runtime;

  findAll(root, VD.ATTR).forEach(el => {
    if (isInsideForTemplate(el, VD.FOR)) return;

    const expression = el.getAttribute(VD.ATTR);
    let appliedKeys: string[] = [];
    const update = () => {
      if (isConditionallyInactive(el)) return;

      const value = evaluate(expression, state, null, el, context.props, {
        directive: VD.ATTR
      });

      if (!value || typeof value !== "object") {
        appliedKeys.forEach(key => removeAttributeIfPresent(el, key));
        appliedKeys = [];
        return;
      }

      const attributes = value as Record<string, unknown>;

      appliedKeys.forEach(key => {
        if (!(key in attributes)) {
          removeAttributeIfPresent(el, key);
        }
      });

      Object.entries(attributes).forEach(([key, attrValue]) => {
        setAttributeValue(el, key, attrValue);
      });

      appliedKeys = Object.keys(attributes);
    };

    update();
    cleanups.push(state._subscribe(update));
  });
}

function normalizeClassValue(value: unknown) {
  const classes = new Set<string>();

  if (typeof value === "string") {
    addClassNames(classes, value);
    return classes;
  }

  if (Array.isArray(value)) {
    value
      .map(normalizeClassValue)
      .forEach(group => {
        group.forEach(name => classes.add(name));
      });
    return classes;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([name, enabled]) => {
      if (enabled) {
        addClassNames(classes, name);
      }
    });
  }

  return classes;
}

function addClassNames(classes: Set<string>, value: string) {
  value
    .split(/\s+/)
    .filter(Boolean)
    .forEach(name => classes.add(name));
}

function setAttributeValue(el: Element, key: string, value: unknown) {
  if (value === null || value === undefined || value === false) {
    removeAttributeIfPresent(el, key);
    return;
  }

  if (value === true) {
    setAttributeIfChanged(el, key, "");
    return;
  }

  setAttributeIfChanged(el, key, String(value));
}

function toCssProperty(key: string) {
  return key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

function setAttributeIfChanged(
  el: Element,
  name: string,
  value: string
) {
  if (el.getAttribute(name) !== value) {
    el.setAttribute(name, value);
  }
}

function removeAttributeIfPresent(el: Element, name: string) {
  if (el.hasAttribute(name)) {
    el.removeAttribute(name);
  }
}

function setStylePropertyIfChanged(
  style: CSSStyleDeclaration,
  key: string,
  value: string
) {
  const property = toCssProperty(key);

  if (style.getPropertyValue(property) !== value) {
    style.setProperty(property, value);
  }
}

function removeStyleProperty(style: CSSStyleDeclaration, key: string) {
  const property = toCssProperty(key);

  if (style.getPropertyValue(property) !== "") {
    style.setProperty(property, "");
  }
}
