/**
 * ----------------------------------------
 * Module: Loop Directives
 * ----------------------------------------
 *
 * Renders iterable vd-for blocks with local scopes and guarantees that old
 * nodes, listeners, and subscriptions are disposed before rerender.
 * ----------------------------------------
 */

import { VD } from "../../constants.ts";
import {
  createScope,
  evaluate,
  isIterable
} from "../expression.ts";
import { reportUserActionError } from "../../errors/error-reporter.ts";
import {
  findAll,
  isConditionallyInactive
} from "../runtime.ts";
import type {
  DirectiveCleanup,
  DirectiveFeature
} from "../runtime.ts";

interface RenderedLoopItem {
  node: Element;
  cleanup: DirectiveCleanup;
}

interface LoopSnapshot {
  source: unknown;
  items: unknown[];
}

/** Applies loop templates using the feature set already loaded by the parent. */
export const applyLoops: DirectiveFeature = ({
  root,
  state,
  cleanups,
  context,
  applyNested
}) => {
  findAll(root, VD.FOR).forEach(el => {
    if (el.parentElement?.closest(VD.selector(VD.FOR))) return;

    const expression = el.getAttribute(VD.FOR) || "";
    const config = parseFor(expression);

    if (!config) {
      reportUserActionError(`Invalid ${VD.FOR} expression`, {
        title: "Invalid Loop Expression",
        directive: VD.FOR,
        expression,
        file: "velodom/directives/features/loops.ts",
        line: 38,
        el,
        hint: "Use: item in items OR (item, index) in items"
      });
      return;
    }

    const marker = document.createComment(`vd-for: ${expression}`);
    const template = el.cloneNode(true) as Element;
    const rendered: RenderedLoopItem[] = [];
    let snapshot: LoopSnapshot | null = null;

    template.removeAttribute(VD.FOR);
    el.replaceWith(marker);

    const update = () => {
      if (isConditionallyInactive(el)) return;

      const items = evaluate(
        config.source,
        state,
        null,
        el,
        context.props,
        {
          directive: VD.FOR
        }
      ) ?? [];

      if (!isIterable(items)) {
        clearRenderedLoop(rendered);
        snapshot = null;
        reportUserActionError("Loop source is not iterable", {
          title: "Invalid Loop Source",
          directive: VD.FOR,
          expression: config.source,
          file: "velodom/directives/features/loops.ts",
          line: 72,
          el,
          hint: "Return an array or iterable value from the loop expression."
        });
        return;
      }

      const nextItems = [...items];

      // Keep existing loop nodes when the iterable structure is unchanged.
      // Child directive subscriptions still receive the same state update, so
      // text/class/style changes inside each item remain reactive.
      if (snapshot && isSameLoopStructure(snapshot, items, nextItems)) {
        return;
      }

      clearRenderedLoop(rendered);

      const fragment = document.createDocumentFragment();

      nextItems.forEach((item, index) => {
        const clone = template.cloneNode(true) as Element;
        const scoped = createScope(state, {
          [config.item]: item,
          [config.index]: index,
          $index: index
        });
        const cleanup = applyNested(clone, scoped, context);

        fragment.append(clone);
        rendered.push({
          node: clone,
          cleanup
        });
      });

      marker.parentNode?.insertBefore(fragment, marker.nextSibling);
      snapshot = {
        source: items,
        items: nextItems
      };
    };

    update();
    cleanups.push(() => {
      clearRenderedLoop(rendered);
    });
    cleanups.push(state._subscribe(update));
  });
};

function clearRenderedLoop(rendered: RenderedLoopItem[]) {
  rendered.forEach(item => {
    item.cleanup();
    item.node.remove();
  });

  rendered.length = 0;
}

function isSameLoopStructure(
  snapshot: LoopSnapshot,
  source: unknown,
  items: unknown[]
) {
  if (snapshot.source === source && snapshot.items.length !== items.length) {
    return false;
  }

  if (snapshot.items.length !== items.length) {
    return false;
  }

  return items.every((item, index) => Object.is(item, snapshot.items[index]));
}

function parseFor(expression: string) {
  const match = expression.match(
    /^\s*(?:\(\s*([\w$]+)\s*,\s*([\w$]+)\s*\)|([\w$]+))\s+in\s+(.+)\s*$/
  );

  if (!match) return null;

  return {
    item: match[1] || match[3],
    index: match[2] || "$index",
    source: match[4]
  };
}
