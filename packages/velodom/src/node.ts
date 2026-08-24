/**
 * ----------------------------------------
 * Module: Node Request Adapter
 * ----------------------------------------
 *
 * Bridges Node's HTTP server to the standard Request/Response contract for
 * application-owned dynamic pages or APIs. It deliberately owns no template
 * rendering, sessions, hydration, or streaming policy.
 * ----------------------------------------
 */

import type {
  IncomingMessage,
  ServerResponse
} from "node:http";
import type { MaybePromise } from "./types.ts";

/** Application-owned handler used by the optional Node request adapter. */
export type NodeRequestHandler = (request: Request) => MaybePromise<Response>;

/** Optional recovery handler for errors thrown by an application request handler. */
export type NodeRequestErrorHandler = (
  error: unknown,
  request: Request
) => MaybePromise<Response>;

/** Configuration for the explicit Node HTTP adapter. */
export interface NodeRequestAdapterOptions {
  /** Produces a standard response for each Node HTTP request. */
  handle: NodeRequestHandler;
  /** Optionally maps an application failure to a safe response. */
  onError?: NodeRequestErrorHandler;
  /** Origin used when Node receives a relative request target. */
  origin?: string;
}

/** Adapter methods for Fetch-style handling and native Node server wiring. */
export interface NodeRequestAdapter {
  /** Invokes the application handler with a standard Fetch request. */
  handle(request: Request): Promise<Response>;
  /** Converts one Node request/response pair without a framework server. */
  handleNode(request: IncomingMessage, response: ServerResponse): Promise<void>;
  /** Creates a listener accepted directly by `node:http` createServer(). */
  listener(request: IncomingMessage, response: ServerResponse): void;
}

/** Creates an explicit Node HTTP bridge for application-owned dynamic responses. */
export function createNodeRequestAdapter(
  options: NodeRequestAdapterOptions
): NodeRequestAdapter {
  if (!options || typeof options.handle !== "function") {
    throw new TypeError("VeloDom Node adapter needs a handle(request) function");
  }

  const origin = normalizeOrigin(options.origin);
  const handle = async (request: Request) => {
    try {
      return await assertResponse(options.handle(request));
    } catch (error) {
      if (typeof options.onError === "function") {
        return assertResponse(options.onError(error, request));
      }

      throw error;
    }
  };
  const handleNode = async (
    request: IncomingMessage,
    response: ServerResponse
  ) => {
    const fetchRequest = await createFetchRequest(request, origin);

    try {
      const result = await handle(fetchRequest);
      await writeNodeResponse(response, result);
    } catch {
      if (!response.headersSent) {
        response.statusCode = 500;
        response.setHeader("content-type", "text/plain; charset=utf-8");
      }
      response.end("Internal Server Error");
    }
  };

  return {
    handle,
    handleNode,
    listener(request, response) {
      void handleNode(request, response);
    }
  };
}

async function createFetchRequest(request: IncomingMessage, origin: string) {
  const method = String(request.method || "GET").toUpperCase();
  const body = method === "GET" || method === "HEAD"
    ? undefined
    : await readNodeBody(request);

  return new Request(new URL(request.url || "/", origin), {
    body: body?.byteLength ? body : undefined,
    headers: request.headers as HeadersInit,
    method
  });
}

async function readNodeBody(request: IncomingMessage) {
  const chunks: Uint8Array[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

async function writeNodeResponse(response: ServerResponse, result: Response) {
  response.statusCode = result.status;
  response.statusMessage = result.statusText || response.statusMessage;
  result.headers.forEach((value, name) => response.setHeader(name, value));

  if (!result.body || result.status === 204 || result.status === 304) {
    response.end();
    return;
  }

  // Buffering is intentional: streaming and Edge transport are separate V2 work.
  response.end(Buffer.from(await result.arrayBuffer()));
}

async function assertResponse(value: MaybePromise<Response>) {
  const response = await value;

  if (!(response instanceof Response)) {
    throw new TypeError("VeloDom Node handler must return a Response");
  }

  return response;
}

function normalizeOrigin(value: string | undefined) {
  const origin = String(value || "http://localhost").trim();

  try {
    return new URL(origin).origin;
  } catch {
    throw new TypeError("VeloDom Node adapter origin must be an absolute URL");
  }
}
