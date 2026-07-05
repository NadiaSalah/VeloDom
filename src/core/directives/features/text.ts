/**
 * ----------------------------------------
 * Module: Text Directive
 * ----------------------------------------
 *
 * Keeps element text content synchronized with safe reactive expressions.
 * ----------------------------------------
 */

import { VD } from "../../constants.ts";
import { evaluate } from "../expression.ts";
import {
  findAll,
  isConditionallyInactive,
  isInsideForTemplate
} from "../runtime.ts";
import type { DirectiveFeature } from "../runtime.ts";

/** Applies reactive text bindings in the current subtree. */
export const applyText: DirectiveFeature = ({
  root,
  state,
  cleanups,
  context
}) => {
  findAll(root, VD.TEXT).forEach(el => {
    if (isInsideForTemplate(el, VD.FOR)) return;

    const expression = el.getAttribute(VD.TEXT);
    const update = () => {
      if (isConditionallyInactive(el)) return;

      el.textContent = String(
        evaluate(expression, state, null, el, context.props, {
          directive: VD.TEXT
        }) ?? ""
      );
    };

    update();
    cleanups.push(state._subscribe(update));
  });
};
