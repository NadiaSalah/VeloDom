/**
 * ----------------------------------------
 * Module: Visibility Directive
 * ----------------------------------------
 *
 * Toggles visual visibility and pointer interaction without removing the
 * element or its layout slot from the document.
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

/** Applies reactive vd-show visibility behavior. */
export const applyVisibility: DirectiveFeature = ({
  root,
  state,
  cleanups,
  context
}) => {
  findAll(root, VD.SHOW).forEach(el => {
    if (isInsideForTemplate(el, VD.FOR)) return;

    const expression = el.getAttribute(VD.SHOW);
    const update = () => {
      if (isConditionallyInactive(el)) return;

      const visible = Boolean(
        evaluate(expression, state, null, el, context.props, {
          directive: VD.SHOW
        })
      );
      const style = (el as HTMLElement).style;

      style.visibility = visible ? "" : "hidden";
      style.pointerEvents = visible ? "" : "none";
    };

    update();
    cleanups.push(state._subscribe(update));
  });
};
