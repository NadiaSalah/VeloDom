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
export function getRefs(el) {

  const refs = {};

  el.querySelectorAll(VD.selector(VD.REF))
    .forEach(node => {

      const key = node.dataset.vdRef;

      if (refs[key]) {

        if (Array.isArray(refs[key])) {
          refs[key].push(node);
        } else {
          refs[key] = [refs[key], node];
        }

      } else {
        refs[key] = node;
      }

    });

  return refs;
}
