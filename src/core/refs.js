import { VD } from "./constants.js";

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
