import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { velodom } from "../../../packages/velodom/src/vite-plugin/index.ts";

test("Vite Lab integration injects only in development and serves compact metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-lab-vite-"));
  const page = join(root, "src", "pages", "home", "index.html");
  const { mkdir } = await import("node:fs/promises");

  await mkdir(join(root, "src", "pages", "home"), { recursive: true });
  await writeFile(page, '<h1 vd-text="title"></h1>', "utf8");

  try {
    const plugin = velodom({ lab: true });
    let middleware = null;
    const hotEvents = [];

    plugin.configResolved({
      build: { lib: false, ssr: false },
      command: "serve",
      mode: "development",
      root
    });
    plugin.configureServer({
      middlewares: {
        use(callback) {
          middleware = callback;
        }
      },
      ws: {
        send(event) {
          hotEvents.push(event);
        }
      }
    });
    await plugin.load.call({}, `${page}?raw`);
    const tags = plugin.transformIndexHtml.call({
      warn() {}
    }, '<!doctype html><html><head><meta charset="UTF-8"></head></html>', {
      filename: join(root, "index.html")
    });

    assert.equal(tags.length, 2);
    assert.match(tags[0].children, /__VELODOM_LAB__/);
    assert.match(tags[1].children, /mountVeloDomLab/);
    assert.match(tags[1].children, /\/@id\/velodom\/devtools/);

    const response = createResponse();

    middleware({
      method: "GET",
      url: "/__velodom_lab__/metadata"
    }, response, () => assert.fail("Lab endpoint should handle its own URL"));
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(payload.protocolVersion, 1);
    assert.equal(payload.records.length, 1);
    assert.equal(payload.records[0].file, "src/pages/home/index.html");
    assert.equal(payload.records[0].directives[0].name, "data-vd-text");
    assert.equal(response.body.includes(root.replaceAll("\\", "/")), false);
    assert.equal(hotEvents[0].event, "velodom:lab:compiler-update");
    assert.equal(hotEvents[0].data.file, "src/pages/home/index.html");

    const productionPlugin = velodom({ lab: true });

    productionPlugin.configResolved({
      build: { lib: false, ssr: false },
      command: "build",
      mode: "production",
      root
    });
    assert.equal(productionPlugin.transformIndexHtml.call({
      warn() {}
    }, "<html><head><meta charset=\"UTF-8\"></head></html>", {
      filename: join(root, "index.html")
    }), "<html><head><meta charset=\"UTF-8\"></head></html>");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/** Creates a minimal writable response used by the middleware test. */
function createResponse() {
  return {
    body: "",
    headers: {},
    statusCode: 0,
    end(value = "") {
      this.body = value;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    }
  };
}
