/**
 * ----------------------------------------
 * Module: Store Backend Node Adapter
 * ----------------------------------------
 *
 * Adapts Node HTTP requests to the backend fixture's Fetch contract for Vite,
 * preview, integration tests, and the repository browser gate.
 * ----------------------------------------
 */

import { STORE_API_PREFIX } from "./backend-fixture.js";

/** Handles one fixture request and returns false for unrelated static paths. */
export async function handleStoreBackendNodeRequest(
  request,
  response,
  backend
) {
  const url = new URL(
    request.url || "/",
    `http://${request.headers.host || "127.0.0.1"}`
  );

  if (!url.pathname.startsWith(STORE_API_PREFIX)) return false;

  const abortController = new AbortController();
  const abortPendingRequest = () => abortController.abort();

  request.once("aborted", abortPendingRequest);
  response.once("close", abortPendingRequest);

  try {
    const method = String(request.method || "GET").toUpperCase();
    const fetchRequest = new Request(url, {
      method,
      headers: toFetchHeaders(request.headers),
      body: method === "GET" || method === "HEAD" ? undefined : request,
      signal: abortController.signal,
      ...(method === "GET" || method === "HEAD" ? {} : { duplex: "half" })
    });
    const fetchResponse = await backend.handle(fetchRequest);

    if (!fetchResponse) return false;

    const headers = Object.fromEntries(fetchResponse.headers.entries());
    const body = Buffer.from(await fetchResponse.arrayBuffer());

    response.writeHead(fetchResponse.status, headers);
    response.end(body);
    return true;
  } catch (error) {
    if (error?.name === "AbortError" || abortController.signal.aborted) {
      if (!response.writableEnded) response.destroy();
      return true;
    }
    if (response.headersSent) {
      response.end();
      return true;
    }

    response.writeHead(500, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    });
    response.end(JSON.stringify({
      code: "FIXTURE_ADAPTER_ERROR",
      message: error instanceof Error ? error.message : "Fixture adapter failed."
    }));
    return true;
  } finally {
    request.removeListener("aborted", abortPendingRequest);
    response.removeListener("close", abortPendingRequest);
  }
}

function toFetchHeaders(headers) {
  const result = new Headers();

  Object.entries(headers).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      value.forEach(item => result.append(name, item));
    } else if (value !== undefined) {
      result.set(name, value);
    }
  });

  return result;
}
