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
        el.removeAttribute(attrName);
        return;
      }

      el.setAttribute(attrName, String(value));
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

      input.value = String(value ?? "");
      input.setAttribute("value", String(value ?? ""));
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

      input[attrName] = value;

      if (value) {
        input.setAttribute(attrName, "");
      } else {
        input.removeAttribute(attrName);
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

      applied.forEach(name => el.classList.remove(name));

      const next = normalizeClassValue(
        evaluate(expression, state, null, el, context.props, {
          directive: VD.CLASS
        })
      );

      next.forEach(name => el.classList.add(name));
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
        style.cssText = value;
        appliedKeys = [];
        return;
      }

      if (!value || typeof value !== "object") {
        el.removeAttribute("style");
        appliedKeys = [];
        return;
      }

      const styles = value as Record<string, unknown>;

      appliedKeys.forEach(key => {
        if (!(key in styles)) {
          style.setProperty(toCssProperty(key), "");
        }
      });

      Object.entries(styles).forEach(([key, styleValue]) => {
        style.setProperty(toCssProperty(key), String(styleValue ?? ""));
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
        appliedKeys.forEach(key => el.removeAttribute(key));
        appliedKeys = [];
        return;
      }

      const attributes = value as Record<string, unknown>;

      appliedKeys.forEach(key => {
        if (!(key in attributes)) {
          el.removeAttribute(key);
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
    el.removeAttribute(key);
    return;
  }

  if (value === true) {
    el.setAttribute(key, "");
    return;
  }

  el.setAttribute(key, String(value));
}

function toCssProperty(key: string) {
  return key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}
