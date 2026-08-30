/**
 * ----------------------------------------
 * Module: DOM Reference Collection
 * ----------------------------------------
 *
 * Collects named DOM references before page or component initialization and
 * groups repeated names without introducing global state.
 * ----------------------------------------
 */

import { VD } from "./constants.ts";

/** Collects single and repeated vd-ref elements beneath a root. */
export function getRefs(
  el: ParentNode
): Record<string, HTMLElement | HTMLElement[]> {
  const refs: Record<string, HTMLElement | HTMLElement[]> = {};

  el.querySelectorAll<HTMLElement>(VD.selector(VD.REF))
    .forEach(node => {
      const key = node.dataset.vdRef;

      if (!key) return;

      const current = refs[key];

      if (Array.isArray(current)) {
        current.push(node);
        return;
      }

      refs[key] = current
        ? [current, node]
        : node;
    });

  return refs;
}
