import { VD } from "../../constants.ts";
import { evaluate } from "../expression.ts";
import { reportUserActionError } from "../../errors/error-reporter.ts";
import {
  conditionalVisibility,
  hasInactiveConditionalAncestor,
  isInsideForTemplate
} from "../runtime.ts";
import type { DirectiveFeature } from "../runtime.ts";

const invalidPlacementReported = new WeakSet<Element>();
const invalidTypeReported = new WeakSet<Element>();

export const applyConditionals: DirectiveFeature = ({
  root,
  state,
  cleanups,
  context
}) => {
  const conditionals = findConditionalElements(root);
  const processed = new Set<Element>();

  conditionals.forEach(el => {
    if (processed.has(el)) return;
    if (isInsideForTemplate(el, VD.FOR)) return;

    const chain = getConditionalChain(el);

    chain.forEach(node => processed.add(node));

    if (!el.hasAttribute(VD.IF)) {
      reportInvalidConditionalPlacement(el);
      (el as HTMLElement).style.display = "none";
      return;
    }

    const update = () => {
      let matched = false;

      chain.forEach(node => {
        const visible = hasInactiveConditionalAncestor(node)
          ? false
          : shouldShowConditionalNode(
            node,
            state,
            context.props,
            matched
          );

        conditionalVisibility.set(node, visible);
        (node as HTMLElement).style.display = visible ? "" : "none";

        if (visible) {
          matched = true;
        }
      });
    };

    update();
    cleanups.push(state._subscribe(update));
  });
};

function findConditionalElements(root) {
  const nodes: Element[] = [];
  const selector = [
    VD.selector(VD.IF),
    VD.selector(VD.ELSEIF),
    VD.selector(VD.ELSE)
  ].join(", ");

  if (root.matches?.(selector)) {
    nodes.push(root as Element);
  }

  nodes.push(...root.querySelectorAll(selector));

  return nodes;
}

function getConditionalChain(start: Element) {
  const chain = [start];
  let current = start.nextElementSibling;

  while (current && isConditionalFollowup(current)) {
    chain.push(current);

    if (current.hasAttribute(VD.ELSE)) {
      break;
    }

    current = current.nextElementSibling;
  }

  return chain;
}

function isConditionalFollowup(el: Element) {
  return (
    el.hasAttribute(VD.ELSEIF)
    || el.hasAttribute(VD.ELSE)
  );
}

function shouldShowConditionalNode(
  node: Element,
  state,
  props,
  alreadyMatched: boolean
) {
  if (node.hasAttribute(VD.ELSE)) {
    return !alreadyMatched;
  }

  if (alreadyMatched) {
    return false;
  }

  const expression = node.getAttribute(VD.IF)
    ?? node.getAttribute(VD.ELSEIF);
  const directive = node.hasAttribute(VD.IF) ? VD.IF : VD.ELSEIF;
  const value = evaluate(expression, state, null, node, props, {
    directive
  });

  if (typeof value !== "boolean") {
    reportInvalidConditionalType(node, expression, directive, value);
    return false;
  }

  return value;
}

function reportInvalidConditionalPlacement(el: Element) {
  if (invalidPlacementReported.has(el)) return;

  invalidPlacementReported.add(el);

  const directive = el.hasAttribute(VD.ELSEIF) ? VD.ELSEIF : VD.ELSE;
  const previous = el.previousElementSibling;
  let hint = "Place it directly after an element that has vd-if.";

  if (!previous) {
    hint = "This directive needs a previous sibling with vd-if.";
  } else if (previous.hasAttribute(VD.ELSE)) {
    hint = "vd-elseif cannot appear after vd-else.";
  } else if (!(previous.hasAttribute(VD.IF) || previous.hasAttribute(VD.ELSEIF))) {
    hint = "Use vd-if first, then optional vd-elseif, then optional vd-else.";
  }

  reportUserActionError(
    "Conditional directive used without a valid previous if-chain",
    {
      title: "Invalid Conditional Chain",
      directive,
      file: "src/core/directives/features/conditionals.ts",
      line: 130,
      el,
      hint
    }
  );
}

function reportInvalidConditionalType(
  el: Element,
  expression,
  directive: string,
  value: unknown
) {
  if (invalidTypeReported.has(el)) return;

  invalidTypeReported.add(el);

  reportUserActionError(`Expected boolean but got ${typeof value}`, {
    title: "Invalid If Condition Type",
    directive,
    expression,
    file: "src/core/directives/features/conditionals.ts",
    line: 165,
    el,
    hint: "Return true/false explicitly. Example: count > 0"
  });
}
