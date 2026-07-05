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
        file: "src/core/directives/features/loops.ts",
        line: 38,
        el,
        hint: "Use: item in items OR (item, index) in items"
      });
      return;
    }

    const marker = document.createComment(`vd-for: ${expression}`);
    const template = el.cloneNode(true) as Element;
    const rendered: RenderedLoopItem[] = [];

    template.removeAttribute(VD.FOR);
    el.replaceWith(marker);

    const update = () => {
      if (isConditionallyInactive(el)) return;

      clearRenderedLoop(rendered);

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
        reportUserActionError("Loop source is not iterable", {
          title: "Invalid Loop Source",
          directive: VD.FOR,
          expression: config.source,
          file: "src/core/directives/features/loops.ts",
          line: 72,
          el,
          hint: "Return an array or iterable value from the loop expression."
        });
        return;
      }

      let cursor: ChildNode = marker;

      [...items].forEach((item, index) => {
        const clone = template.cloneNode(true) as Element;
        const scoped = createScope(state, {
          [config.item]: item,
          [config.index]: index,
          $index: index
        });
        const cleanup = applyNested(clone, scoped, context);

        cursor.after(clone);
        cursor = clone;
        rendered.push({
          node: clone,
          cleanup
        });
      });
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
