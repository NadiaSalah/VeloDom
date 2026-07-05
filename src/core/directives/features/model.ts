import { VD } from "../../constants.ts";
import {
  readValue,
  writeValue
} from "../expression.ts";
import { reportUserActionError } from "../../errors/error-reporter.ts";
import {
  findAll,
  isConditionallyInactive,
  isInsideForTemplate
} from "../runtime.ts";
import type { DirectiveFeature } from "../runtime.ts";

export const applyModel: DirectiveFeature = ({
  root,
  state,
  cleanups
}) => {
  findAll(root, VD.MODEL).forEach(el => {
    if (isInsideForTemplate(el, VD.FOR)) return;

    const key = el.getAttribute(VD.MODEL);

    if (!key?.trim()) {
      reportUserActionError("Missing model path", {
        title: "Invalid vd-model",
        directive: VD.MODEL,
        file: "src/core/directives/features/model.ts",
        line: 24,
        el,
        hint: "Set vd-model to a state path like user.name"
      });
      return;
    }

    const input = el as HTMLInputElement;

    if (!isConditionallyInactive(el)) {
      setInputValue(input, readValue(key, state));
    }

    const onInput = () => {
      writeValue(key, state, getInputValue(input));
    };

    input.addEventListener("input", onInput);
    cleanups.push(() => input.removeEventListener("input", onInput));

    const update = () => {
      if (isConditionallyInactive(el)) return;

      const value = readValue(key, state);

      if (getInputValue(input) !== value) {
        setInputValue(input, value);
      }
    };

    cleanups.push(state._subscribe(update));
  });
};

function getInputValue(el: HTMLInputElement) {
  if (el.type === "checkbox") {
    return el.checked;
  }

  return el.value;
}

function setInputValue(el: HTMLInputElement, value: unknown) {
  if (el.type === "checkbox") {
    el.checked = Boolean(value);
    return;
  }

  el.value = String(value ?? "");
}
