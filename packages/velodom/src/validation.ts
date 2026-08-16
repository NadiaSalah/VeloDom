/**
 * ----------------------------------------
 * Module: Optional Validation Plugin
 * ----------------------------------------
 *
 * Provides a lightweight plugin around native browser form validation without
 * making validation part of the default runtime path.
 * ----------------------------------------
 */

import {
  VD_VALIDATION
} from "./constants.ts";
import type {
  ValidationPluginOptions,
  VeloDomPlugin
} from "./types.ts";

/**
 * Creates an optional plugin that blocks invalid validated forms before
 * declarative requests or application submit handlers run.
 */
export function createValidationPlugin(
  options: ValidationPluginOptions = {}
): VeloDomPlugin {
  const selector = options.selector || VD_VALIDATION.FORM_SELECTOR;
  const reportValidity = options.reportValidity !== false;
  const markInvalidFields = options.markInvalidFields !== false;

  return {
    setup() {
      const onSubmit = (event: Event) => {
        const form = getValidationForm(event.target, selector);

        if (!form) return;

        if (isFormValid(form)) {
          clearInvalidState(form);
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        if (markInvalidFields) {
          markInvalidState(form);
        }

        if (reportValidity && typeof form.reportValidity === "function") {
          form.reportValidity();
        }
      };

      const onInput = (event: Event) => {
        const form = getValidationForm(event.target, selector);

        if (!form || !markInvalidFields) return;

        markInvalidState(form);
      };

      document.addEventListener(
        VD_VALIDATION.SUBMIT_EVENT,
        onSubmit,
        true
      );
      document.addEventListener(
        VD_VALIDATION.INPUT_EVENT,
        onInput,
        true
      );

      return () => {
        document.removeEventListener(
          VD_VALIDATION.SUBMIT_EVENT,
          onSubmit,
          true
        );
        document.removeEventListener(
          VD_VALIDATION.INPUT_EVENT,
          onInput,
          true
        );
      };
    }
  };
}

function getValidationForm(
  target: EventTarget | null,
  selector: string
) {
  if (target instanceof HTMLFormElement && target.matches(selector)) {
    return target;
  }

  if (target instanceof Element) {
    const form = target.closest(selector);

    return form instanceof HTMLFormElement
      ? form
      : null;
  }

  return null;
}

function isFormValid(form: HTMLFormElement) {
  if (typeof form.checkValidity === "function") {
    return form.checkValidity();
  }

  return getValidatedControls(form).every(control => (
    isControlValid(control)
  ));
}

function markInvalidState(form: HTMLFormElement) {
  const controls = getValidatedControls(form);
  let hasInvalidControl = false;

  controls.forEach(control => {
    const valid = isControlValid(control);

    control.toggleAttribute(
      VD_VALIDATION.FIELD_INVALID_ATTRIBUTE,
      !valid
    );
    hasInvalidControl ||= !valid;
  });

  form.toggleAttribute(
    VD_VALIDATION.INVALID_ATTRIBUTE,
    hasInvalidControl
  );
}

function clearInvalidState(form: HTMLFormElement) {
  form.removeAttribute(VD_VALIDATION.INVALID_ATTRIBUTE);
  getValidatedControls(form).forEach(control => {
    control.removeAttribute(VD_VALIDATION.FIELD_INVALID_ATTRIBUTE);
  });
}

function getValidatedControls(form: HTMLFormElement) {
  return Array.from(form.elements).filter((control): control is HTMLElement => (
    control instanceof HTMLElement
    && typeof (control as HTMLInputElement).checkValidity === "function"
  ));
}

function isControlValid(control: HTMLElement) {
  return (control as HTMLInputElement).checkValidity();
}
