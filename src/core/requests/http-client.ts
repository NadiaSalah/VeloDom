/**
 * ----------------------------------------
 * Module: JSON HTTP Client
 * ----------------------------------------
 *
 * Sends abortable JSON requests, normalizes response parsing, and exposes
 * structured transport errors without coupling requests to application APIs.
 * ----------------------------------------
 */

import { isPlainObject } from "../shared/object.ts";

/** Structured fields accepted by ApiError. */
export interface ApiErrorOptions {
  status?: number;
  url?: string;
  body?: unknown;
  cause?: unknown;
}

/** RequestInit-compatible options with JSON-friendly request bodies. */
export interface JsonRequestOptions extends Omit<
  RequestInit,
  "body" | "headers" | "method"
> {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

/** Error carrying HTTP status, URL, response body, and original cause. */
export class ApiError extends Error {
  status: number;
  url: string;
  body: unknown;

  constructor(
    message: string,
    {
      status = 0,
      url = "",
      body = null,
      cause
    }: ApiErrorOptions = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
    this.body = body;

    if (cause) {
      this.cause = cause;
    }
  }
}

/** Sends a request and returns its parsed JSON payload or null for HTTP 204. */
export async function requestJson(
  url: RequestInfo | URL,
  options: JsonRequestOptions = {}
) {
  const requestUrl = getRequestUrl(url);
  const method = String(options.method || "GET").toUpperCase();
  const headers = {
    Accept: "application/json",
    ...(options.headers || {})
  };
  const requestOptions: RequestInit = {
    method,
    headers,
    signal: options.signal
  };

  if (options.credentials) {
    requestOptions.credentials = options.credentials;
  }

  if (options.body !== undefined) {
    headers["Content-Type"] ??= "application/json";
    requestOptions.body = typeof options.body === "string"
      ? options.body
      : JSON.stringify(options.body);
  }

  let response;

  try {
    response = await fetch(url, requestOptions);
  } catch (error) {
    if (getErrorProperty(error, "name") === "AbortError") {
      throw error;
    }

    throw new ApiError(
      String(
        getErrorProperty(error, "message")
        || `Network request failed for ${requestUrl}`
      ),
      {
        url: requestUrl,
        cause: error
      }
    );
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      if (!response.ok) {
        throw new ApiError(
          `Request failed (${response.status}) for ${requestUrl}`,
          {
            status: response.status,
            url: requestUrl,
            body: text,
            cause: error
          }
        );
      }

      throw new ApiError(
        `Expected JSON response from ${requestUrl}`,
        {
          status: response.status,
          url: requestUrl,
          body: text,
          cause: error
        }
      );
    }
  }

  if (!response.ok) {
    const record = isPlainObject(payload)
      ? payload
      : null;
    const message = record?.message
      || record?.error
      || `Request failed (${response.status}) for ${requestUrl}`;

    throw new ApiError(String(message), {
      status: response.status,
      url: requestUrl,
      body: payload
    });
  }

  return payload;
}

function getRequestUrl(url: RequestInfo | URL) {
  if (typeof url === "string") return url;
  if (url instanceof URL) return url.href;

  return url.url;
}

function getErrorProperty(error: unknown, key: string) {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  return (error as Record<string, unknown>)[key];
}
