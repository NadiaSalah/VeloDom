/**
 * ----------------------------------------
 * Module: Progressive Native Forms
 * ----------------------------------------
 *
 * Responsibilities:
 * - Enhance explicitly opted-in native forms after browser validation.
 * - Preserve action, method, FormData, redirects, and application CSRF data.
 * - Surface loading and server-error state without a required form runtime.
 *
 * Used by:
 * - Applications that install createProgressiveFormsPlugin().
 *
 * Notes:
 * A form remains a normal HTML form until this optional plugin is installed.
 * The server owns validation, cookies, CSRF policy, redirects, and data shape.
 * ----------------------------------------
 */

import { VD_FORMS } from "./constants.ts";
import type {
  ProgressiveFormRequestContext,
  ProgressiveFormResponseContext,
  ProgressiveFormsPluginOptions,
  UnknownRecord,
  VeloDomPlugin
} from "./types.ts";

type FormState = "error" | "idle" | "loading" | "success";

interface FormResponseError extends Error {
  data: unknown;
}

/**
 * Creates an optional enhancement bridge for forms marked with `vd-form`.
 *
 * The plugin intercepts only opted-in GET and POST forms. Forms continue to
 * use their native `action` and `method` when JavaScript or this plugin is
 * unavailable.
 */
export function createProgressiveFormsPlugin(
  options: ProgressiveFormsPluginOptions = {}
): VeloDomPlugin {
  const selector = options.selector || VD_FORMS.FORM_SELECTOR;
  const transport = options.fetch || globalThis.fetch;

  if (typeof transport !== "function") {
    throw new TypeError("Progressive forms require a fetch implementation");
  }

  return {
    setup(pluginContext) {
      const activeRequests = new Map<HTMLFormElement, AbortController>();

      const onSubmit = (event: Event) => {
        const form = getProgressiveForm(event.target, selector);

        if (!form || activeRequests.has(form)) return;

        if (!isSupportedMethod(form)) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        if (!isFormValid(form)) {
          setFormState(form, "error", "Please correct the highlighted fields.");
          markInvalidFields(form, {});

          if (typeof form.reportValidity === "function") {
            form.reportValidity();
          }

          return;
        }

        const controller = new AbortController();
        activeRequests.set(form, controller);
        void submitForm(form, controller, pluginContext.navigate, transport, options)
          .finally(() => {
            if (activeRequests.get(form) === controller) {
              activeRequests.delete(form);
            }
          });
      };

      document.addEventListener(VD_FORMS.SUBMIT_EVENT, onSubmit, true);

      return () => {
        document.removeEventListener(VD_FORMS.SUBMIT_EVENT, onSubmit, true);
        activeRequests.forEach(controller => controller.abort());
        activeRequests.clear();
      };
    }
  };
}

async function submitForm(
  form: HTMLFormElement,
  controller: AbortController,
  navigate: (path: string, pagePath?: string) => Promise<unknown>,
  transport: typeof fetch,
  options: ProgressiveFormsPluginOptions
) {
  const request = createRequestContext(form);

  clearFieldErrors(form);
  setFormState(form, "loading", "Sending…");

  try {
    const response = await transport(
      requestUrl(request).toString(),
      createFetchOptions(request, controller, options)
    );
    const data = await readResponseData(response);

    if (!response.ok) {
      throw createResponseError(response, data);
    }

    const context: ProgressiveFormResponseContext = {
      ...request,
      data,
      response
    };
    const redirect = resolveRedirect(response, data);

    setFormState(form, "success", getSuccessMessage(data));
    form.dispatchEvent(new CustomEvent(VD_FORMS.SUCCESS_EVENT, {
      detail: context
    }));

    if (redirect) {
      await followRedirect(redirect, context, navigate, options);
    }
  } catch (error) {
    if (controller.signal.aborted) return;

    const responseError = error as Partial<FormResponseError>;
    const data = responseError.data;
    const message = getErrorMessage(error, data);

    setFormState(form, "error", message);
    markInvalidFields(form, getFieldErrors(data));
    form.dispatchEvent(new CustomEvent(VD_FORMS.ERROR_EVENT, {
      detail: {
        error,
        form,
        data
      }
    }));
  }
}

function getProgressiveForm(target: EventTarget | null, selector: string) {
  if (target instanceof HTMLFormElement && target.matches(selector)) {
    return target;
  }

  if (target instanceof Element) {
    const form = target.closest(selector);

    return form instanceof HTMLFormElement ? form : null;
  }

  return null;
}

function isSupportedMethod(form: HTMLFormElement) {
  const method = (form.getAttribute("method") || "get").toUpperCase();

  return method === "GET" || method === "POST";
}

function isFormValid(form: HTMLFormElement) {
  return typeof form.checkValidity !== "function" || form.checkValidity();
}

function createRequestContext(form: HTMLFormElement): ProgressiveFormRequestContext {
  const method = (form.getAttribute("method") || "get").toUpperCase() as "GET" | "POST";
  const action = new URL(
    form.getAttribute("action") || window.location.href,
    window.location.href
  );

  return {
    action,
    form,
    formData: new FormData(form),
    method
  };
}

function requestUrl(context: ProgressiveFormRequestContext) {
  const url = new URL(context.action);

  if (context.method === "GET") {
    toUrlSearchParams(context.formData).forEach((value, key) => {
      url.searchParams.append(key, value);
    });
  }

  return url;
}

function createFetchOptions(
  context: ProgressiveFormRequestContext,
  controller: AbortController,
  options: ProgressiveFormsPluginOptions
) {
  const headers = typeof options.headers === "function"
    ? options.headers(context)
    : options.headers;

  return {
    method: context.method,
    headers,
    body: context.method === "POST"
      ? createFormBody(context.form, context.formData)
      : undefined,
    credentials: options.credentials || "same-origin",
    redirect: "follow" as const,
    signal: controller.signal
  };
}

function createFormBody(form: HTMLFormElement, formData: FormData) {
  const enctype = (form.getAttribute("enctype") || "application/x-www-form-urlencoded")
    .toLowerCase()
    .split(";", 1)[0]
    .trim();

  return enctype === "multipart/form-data"
    ? formData
    : toUrlSearchParams(formData);
}

function toUrlSearchParams(formData: FormData) {
  const params = new URLSearchParams();

  formData.forEach((value, key) => {
    params.append(key, typeof value === "string" ? value : value.name);
  });

  return params;
}

async function readResponseData(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function createResponseError(response: Response, data: unknown): FormResponseError {
  const error = new Error(
    getErrorMessage(null, data) || `Form submission failed (${response.status})`
  ) as FormResponseError;

  error.data = data;
  return error;
}

function resolveRedirect(response: Response, data: unknown) {
  if (response.redirected && response.url) {
    return new URL(response.url, window.location.href);
  }

  if (isRecord(data) && typeof data.redirect === "string" && data.redirect) {
    return new URL(data.redirect, window.location.href);
  }

  return null;
}

async function followRedirect(
  url: URL,
  context: ProgressiveFormResponseContext,
  navigate: (path: string, pagePath?: string) => Promise<unknown>,
  options: ProgressiveFormsPluginOptions
) {
  if (options.onRedirect) {
    await options.onRedirect(url, context);
    return;
  }

  if (url.origin === window.location.origin) {
    await navigate(`${url.pathname}${url.search}${url.hash}`);
    return;
  }

  window.location.assign(url.toString());
}

function setFormState(form: HTMLFormElement, state: FormState, message: string) {
  form.setAttribute(VD_FORMS.STATE_ATTRIBUTE, state);
  form.toggleAttribute(VD_FORMS.LOADING_ATTRIBUTE, state === "loading");
  form.setAttribute("aria-busy", state === "loading" ? "true" : "false");
  findStatusElements(form).forEach(status => {
    status.textContent = message;
  });
}

function findStatusElements(form: HTMLFormElement) {
  return Array.from(form.querySelectorAll(VD_FORMS.STATUS_SELECTOR));
}

function clearFieldErrors(form: HTMLFormElement) {
  form.querySelectorAll(`[${VD_FORMS.ERROR_ATTRIBUTE}]`).forEach(element => {
    element.textContent = "";
  });
  getNamedControls(form).forEach(control => {
    control.removeAttribute(VD_FORMS.ERROR_FIELD_ATTRIBUTE);
    control.removeAttribute("aria-invalid");
  });
}

function markInvalidFields(form: HTMLFormElement, errors: Record<string, string>) {
  const controls = getNamedControls(form);
  const invalidNames = new Set(Object.keys(errors));

  controls.forEach(control => {
    const invalid = invalidNames.has(control.getAttribute("name") || "")
      || !isControlValid(control);

    control.toggleAttribute(VD_FORMS.ERROR_FIELD_ATTRIBUTE, invalid);

    if (invalid) {
      control.setAttribute("aria-invalid", "true");
    } else {
      control.removeAttribute("aria-invalid");
    }
  });

  form.querySelectorAll(`[${VD_FORMS.ERROR_ATTRIBUTE}]`).forEach(element => {
    const name = element.getAttribute(VD_FORMS.ERROR_ATTRIBUTE) || "";
    element.textContent = errors[name] || "";
  });

  const firstInvalid = controls.find(control => (
    control.hasAttribute(VD_FORMS.ERROR_FIELD_ATTRIBUTE)
  ));

  if (firstInvalid && typeof firstInvalid.focus === "function") {
    firstInvalid.focus();
  }
}

function getNamedControls(form: HTMLFormElement) {
  return Array.from(form.elements).filter((control): control is HTMLElement => (
    control instanceof HTMLElement && control.hasAttribute("name")
  ));
}

function isControlValid(control: HTMLElement) {
  const candidate = control as HTMLInputElement;

  return typeof candidate.checkValidity !== "function" || candidate.checkValidity();
}

function getFieldErrors(data: unknown) {
  if (!isRecord(data) || !isRecord(data.errors)) {
    return {};
  }

  return Object.fromEntries(Object.entries(data.errors)
    .map(([name, value]) => [name, getTextValue(value)])
    .filter(([, message]) => Boolean(message)));
}

function getSuccessMessage(data: unknown) {
  return isRecord(data) && typeof data.message === "string"
    ? data.message
    : "Submitted successfully.";
}

function getErrorMessage(error: unknown, data: unknown) {
  if (isRecord(data)) {
    if (typeof data.message === "string") return data.message;
    if (typeof data.error === "string") return data.error;
  }

  return error instanceof Error ? error.message : "Unable to submit the form.";
}

function getTextValue(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];

  return "";
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
