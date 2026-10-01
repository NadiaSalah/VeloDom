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

const managedErrorMessages = new WeakMap<HTMLElement, string>();
let nextErrorId = 0;

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
      // Only observe while a form owns a request; routed page replacement must
      // release a detached upload even though the plugin itself stays mounted.
      const observer = typeof MutationObserver === "function"
        ? new MutationObserver(() => {
          for (const [form, controller] of activeRequests) {
            if (form.isConnected) continue;
            controller.abort();
            setFormState(form, "idle", "");
            activeRequests.delete(form);
          }
          if (activeRequests.size === 0) observer?.disconnect();
        })
        : null;

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
        if (activeRequests.size === 1) {
          observer?.observe(document, { childList: true, subtree: true });
        }
        void submitForm(form, controller, pluginContext.navigate, transport, options)
          .finally(() => {
            if (activeRequests.get(form) === controller) {
              activeRequests.delete(form);
            }
            if (activeRequests.size === 0) observer?.disconnect();
          });
      };

      document.addEventListener(VD_FORMS.SUBMIT_EVENT, onSubmit, true);

      return () => {
        document.removeEventListener(VD_FORMS.SUBMIT_EVENT, onSubmit, true);
        observer?.disconnect();
        activeRequests.forEach((controller, form) => {
          controller.abort();
          setFormState(form, "idle", "");
        });
        activeRequests.clear();
      };
    }
  };
}

/** Submits the form. */
async function submitForm(
  form: HTMLFormElement,
  controller: AbortController,
  navigate: (path: string, pagePath?: string) => Promise<unknown>,
  transport: typeof fetch,
  options: ProgressiveFormsPluginOptions
) {
  clearFieldErrors(form);
  setFormState(form, "loading", "Sending…");

  try {
    const request = createRequestContext(form);
    const response = await transport(
      requestUrl(request).toString(),
      createFetchOptions(request, controller, options)
    );
    if (!canCommitForm(form, controller)) return;
    const data = await readResponseData(response);
    if (!canCommitForm(form, controller)) return;

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
      try {
        await followRedirect(redirect, context, navigate, options);
      } catch {
        // A failed redirect is not a failed server write; keep success visible.
        if (canCommitForm(form, controller)) {
          setFormState(form, "success", "Submitted, but navigation could not be completed.");
        }
      }
    }
  } catch (error) {
    if (!canCommitForm(form, controller)) return;

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

/** Prevents a detached or aborted form from reporting a late request result. */
function canCommitForm(form: HTMLFormElement, controller: AbortController): boolean {
  if (controller.signal.aborted) return false;
  if (form.isConnected) return true;
  controller.abort();
  return false;
}

/** Returns the progressive form. */
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

/** Evaluates the `isSupportedMethod()` condition for the supplied input. */
function isSupportedMethod(form: HTMLFormElement) {
  const method = (form.getAttribute("method") || "get").toUpperCase();

  return method === "GET" || method === "POST";
}

/** Evaluates the `isFormValid()` condition for the supplied input. */
function isFormValid(form: HTMLFormElement) {
  return typeof form.checkValidity !== "function" || form.checkValidity();
}

/** Creates the request context. */
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

/** Performs the internal `requestUrl()` operation. */
function requestUrl(context: ProgressiveFormRequestContext) {
  const url = new URL(context.action);

  if (context.method === "GET") {
    toUrlSearchParams(context.formData).forEach((value, key) => {
      url.searchParams.append(key, value);
    });
  }

  return url;
}

/** Creates the fetch options. */
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

/** Creates the form body. */
function createFormBody(form: HTMLFormElement, formData: FormData) {
  const enctype = (form.getAttribute("enctype") || "application/x-www-form-urlencoded")
    .toLowerCase()
    .split(";", 1)[0]?.trim()
    || "application/x-www-form-urlencoded";

  return enctype === "multipart/form-data"
    ? formData
    : toUrlSearchParams(formData);
}

/** Performs the internal `toUrlSearchParams()` operation. */
function toUrlSearchParams(formData: FormData) {
  const params = new URLSearchParams();

  formData.forEach((value, key) => {
    params.append(key, typeof value === "string" ? value : value.name);
  });

  return params;
}

/** Reads the response data. */
async function readResponseData(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

/** Creates the response error. */
function createResponseError(response: Response, data: unknown): FormResponseError {
  const error = new Error(
    getErrorMessage(null, data) || `Form submission failed (${response.status})`
  ) as FormResponseError;

  error.data = data;
  return error;
}

/** Resolves the redirect. */
function resolveRedirect(response: Response, data: unknown) {
  if (response.redirected && response.url) {
    return new URL(response.url, window.location.href);
  }

  if (isRecord(data) && typeof data.redirect === "string" && data.redirect) {
    return new URL(data.redirect, window.location.href);
  }

  return null;
}

/** Follows the redirect. */
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

/** Sets the form state. */
function setFormState(form: HTMLFormElement, state: FormState, message: string) {
  form.setAttribute(VD_FORMS.STATE_ATTRIBUTE, state);
  form.toggleAttribute(VD_FORMS.LOADING_ATTRIBUTE, state === "loading");
  form.setAttribute("aria-busy", state === "loading" ? "true" : "false");
  findStatusElements(form).forEach(status => {
    status.textContent = message;
  });
}

/** Finds the status elements. */
function findStatusElements(form: HTMLFormElement) {
  return Array.from(form.querySelectorAll(VD_FORMS.STATUS_SELECTOR));
}

/** Clears the field errors. */
function clearFieldErrors(form: HTMLFormElement) {
  form.querySelectorAll(`[${VD_FORMS.ERROR_ATTRIBUTE}]`).forEach(element => {
    element.textContent = "";
  });
  getNamedControls(form).forEach(control => {
    control.removeAttribute(VD_FORMS.ERROR_FIELD_ATTRIBUTE);
    control.removeAttribute("aria-invalid");
    if (managedErrorMessages.get(control) === control.getAttribute("aria-errormessage")) {
      control.removeAttribute("aria-errormessage");
    }
    managedErrorMessages.delete(control);
  });
}

/** Marks the invalid fields. */
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
    if (!errors[name]) return;
    if (!element.id) {
      do { element.id = `${VD_FORMS.ERROR_ID_PREFIX}${++nextErrorId}`; }
      while (document.getElementById(element.id) !== element);
    }
    controls.filter(control => control.getAttribute("name") === name).forEach(control => {
      if (control.hasAttribute("aria-errormessage")) return;
      control.setAttribute("aria-errormessage", element.id);
      managedErrorMessages.set(control, element.id);
    });
  });

  const firstInvalid = controls.find(control => (
    control.hasAttribute(VD_FORMS.ERROR_FIELD_ATTRIBUTE)
  ));

  if (firstInvalid && typeof firstInvalid.focus === "function") {
    firstInvalid.focus();
  }
}

/** Returns the named controls. */
function getNamedControls(form: HTMLFormElement) {
  return Array.from(form.elements).filter((control): control is HTMLElement => (
    control instanceof HTMLElement && control.hasAttribute("name")
  ));
}

/** Evaluates the `isControlValid()` condition for the supplied input. */
function isControlValid(control: HTMLElement) {
  const candidate = control as HTMLInputElement;

  return typeof candidate.checkValidity !== "function" || candidate.checkValidity();
}

/** Returns the field errors. */
function getFieldErrors(data: unknown) {
  if (!isRecord(data) || !isRecord(data.errors)) {
    return {};
  }

  return Object.fromEntries(Object.entries(data.errors)
    .map(([name, value]) => [name, getTextValue(value)])
    .filter(([, message]) => Boolean(message)));
}

/** Returns the success message. */
function getSuccessMessage(data: unknown) {
  return isRecord(data) && typeof data.message === "string"
    ? data.message
    : "Submitted successfully.";
}

/** Returns the error message. */
function getErrorMessage(error: unknown, data: unknown) {
  if (isRecord(data)) {
    if (typeof data.message === "string") return data.message;
    if (typeof data.error === "string") return data.error;
  }

  return error instanceof Error ? error.message : "Unable to submit the form.";
}

/** Returns the text value. */
function getTextValue(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];

  return "";
}

/** Evaluates the `isRecord()` condition for the supplied input. */
function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
