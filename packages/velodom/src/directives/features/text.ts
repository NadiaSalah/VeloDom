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
    let currentText: string | null = null;
    const update = () => {
      if (isConditionallyInactive(el)) return;

      const nextText = String(
        evaluate(expression, state, null, el, context.props, {
          directive: VD.TEXT
        }) ?? ""
      );

      // Avoid unnecessary text-node replacement on unrelated state updates.
      if (nextText !== currentText) {
        el.textContent = nextText;
        currentText = nextText;
      }
    };

    update();
    cleanups.push(state._subscribe(update));
  });
};
