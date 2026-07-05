import { VD } from "../../constants.ts";
import { applyRequests } from "../../requests/request-router.ts";
import {
  evaluate,
  writeValue
} from "../expression.ts";
import {
  findAll,
  isInsideForTemplate
} from "../runtime.ts";
import type { DirectiveFeature } from "../runtime.ts";

export const applyRequestDirectives: DirectiveFeature = ({
  root,
  state,
  cleanups,
  context
}) => {
  applyRequests(root, state, cleanups, context, {
    findAll,
    isInsideForTemplate: el => isInsideForTemplate(el, VD.FOR),
    evaluate,
    writeValue
  });
};
