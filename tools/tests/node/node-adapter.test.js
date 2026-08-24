import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import {
  createNodeRequestAdapter
} from "../../../packages/velodom/src/node.ts";

test("Node adapter preserves standard request data and response headers", async () => {
  const adapter = createNodeRequestAdapter({
    origin: "http://127.0.0.1",
    async handle(request) {
      const body = request.method === "POST" ? await request.text() : "";

      return new Response(`${request.url}:${body}`, {
        headers: {
          "content-type": "text/plain",
          "x-velodom": "node"
        },
        status: 201
      });
    }
  });
  const server = createServer(adapter.listener);

  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    const response = await fetch(
      `http://127.0.0.1:${address.port}/profile?tab=posts`,
      { body: "hello", method: "POST" }
    );

    assert.equal(response.status, 201);
    assert.equal(response.headers.get("x-velodom"), "node");
    assert.equal(
      await response.text(),
      `http://127.0.0.1/profile?tab=posts:hello`
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test("Node adapter keeps application recovery explicit", async () => {
  const adapter = createNodeRequestAdapter({
    handle() {
      throw new Error("private detail");
    },
    onError() {
      return new Response("Unavailable", { status: 503 });
    }
  });
  const response = await adapter.handle(new Request("http://localhost/"));

  assert.equal(response.status, 503);
  assert.equal(await response.text(), "Unavailable");
});
