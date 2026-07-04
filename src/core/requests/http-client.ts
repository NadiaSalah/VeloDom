export class ApiError extends Error {
  status: number;
  url: string;
  body: unknown;

  constructor(
    message,
    {
      status = 0,
      url = "",
      body = null,
      cause
    }: any = {}
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

export async function requestJson(url, options: any = {}) {
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
    if (error?.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      error?.message || `Network request failed for ${url}`,
      {
        url,
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
          `Request failed (${response.status}) for ${url}`,
          {
            status: response.status,
            url,
            body: text,
            cause: error
          }
        );
      }

      throw new ApiError(
        `Expected JSON response from ${url}`,
        {
          status: response.status,
          url,
          body: text,
          cause: error
        }
      );
    }
  }

  if (!response.ok) {
    const message = payload?.message
      || payload?.error
      || `Request failed (${response.status}) for ${url}`;

    throw new ApiError(message, {
      status: response.status,
      url,
      body: payload
    });
  }

  return payload;
}
