/**
 * ----------------------------------------
 * Module: Event Directives
 * ----------------------------------------
 *
 * Attaches normalized event handlers, enforces modifiers, evaluates safe
 * handler expressions, and removes listeners during subtree cleanup.
 * ----------------------------------------
 */

import {
  VD,
  VD_EVENT_KEY_MODIFIERS
} from "../../constants.ts";
import { evaluate } from "../expression.ts";
import { reportUserActionError } from "../../errors/error-reporter.ts";
import {
  isConditionallyInactive,
  isInsideForTemplate
} from "../runtime.ts";
import type {
  DirectiveFeature,
  DirectiveRoot
} from "../runtime.ts";

/** Applies event directives and their keyboard/lifecycle modifiers. */
export const applyEvents: DirectiveFeature = ({
  root,
  state,
  cleanups,
  context
}) => {
  findEventElements(root).forEach(el => {
    if (isInsideForTemplate(el, VD.FOR)) return;

    [...el.attributes].forEach(attr => {
      const config = parseEventDirective(attr.name);

      if (!config) return;

      const expression = attr.value;
      let removed = false;
      const removeHandler = () => {
        if (removed) return;

        removed = true;
        el.removeEventListener(config.eventName, handler);
      };
      const handler = (event: Event) => {
        if (isConditionallyInactive(el)) return;
        if (!shouldRunEventHandler(config.modifiers, event)) return;

        if (config.modifiers.has("once")) {
          removeHandler();
        }

        if (config.modifiers.has("prevent")) {
          event.preventDefault();
        }

        if (config.modifiers.has("stop")) {
          event.stopPropagation();
        }

        Promise.resolve(
          evaluate(expression, state, event, el, context.props, {
            directive: `${VD.ON}-${config.eventName}`
          })
        ).catch(err => {
          reportUserActionError(err, {
            title: "Event Handler Error",
            directive: `${VD.ON}-${config.eventName}`,
            expression,
            file: "src/core/directives/features/events.ts",
            line: 64,
            el,
            hint: "Check the handler expression and referenced state/functions."
          });
        });
      };

      el.addEventListener(config.eventName, handler);
      cleanups.push(removeHandler);
    });
  });
};

function findEventElements(root: DirectiveRoot) {
  const nodes: Element[] = [];

  if (hasEventDirective(root as Element)) {
    nodes.push(root as Element);
  }

  root.querySelectorAll("*").forEach(el => {
    if (hasEventDirective(el)) {
      nodes.push(el);
    }
  });

  return nodes;
}

function hasEventDirective(el: Element) {
  return [...(el?.attributes ?? [])]
    .some(attr => Boolean(parseEventDirective(attr.name)));
}

function parseEventDirective(attrName: string) {
  if (!attrName.startsWith(VD.ON)) return null;

  const raw = attrName
    .replace(VD.ON, "")
    .replace(/^-/, "");

  if (!raw) return null;

  const [eventName, ...modifiers] = raw
    .split(".")
    .filter(Boolean);

  if (!eventName) return null;

  return {
    eventName,
    modifiers: new Set(modifiers.map(name => name.toLowerCase()))
  };
}

function shouldRunEventHandler(
  modifiers: Set<string>,
  event: Event
) {
  const keys = [...modifiers].filter(isKeyModifier);

  if (!keys.length) return true;

  const eventKey = normalizeEventKey((event as KeyboardEvent).key);

  if (!eventKey) return false;

  return keys.some(key => key === eventKey);
}

function isKeyModifier(name: string) {
  return VD_EVENT_KEY_MODIFIERS.some(key => key === name);
}

function normalizeEventKey(key: string) {
  if (!key) return "";

  const lower = key.toLowerCase();

  if (lower === "enter") return "enter";
  if (lower === "tab") return "tab";
  if (lower === "delete" || lower === "backspace") return "delete";
  if (lower === "escape" || lower === "esc") return "esc";
  if (lower === " " || lower === "spacebar" || lower === "space") return "space";
  if (lower === "arrowup" || lower === "up") return "up";
  if (lower === "arrowdown" || lower === "down") return "down";
  if (lower === "arrowleft" || lower === "left") return "left";
  if (lower === "arrowright" || lower === "right") return "right";

  return lower;
}
