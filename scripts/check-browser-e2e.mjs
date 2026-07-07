/**
 * ----------------------------------------
 * Module: Browser E2E Smoke Test
 * ----------------------------------------
 *
 * Serves the production build and drives a real local Chrome/Edge browser
 * through VeloDom routing, forms, requests, and static SEO fallback checks.
 * ----------------------------------------
 */

import {
  access,
  readFile,
  stat
} from "node:fs/promises";
import { createServer } from "node:http";
import {
  extname,
  join,
  resolve,
  sep
} from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const projectRoot = resolve(
  fileURLToPath(new URL("..", import.meta.url))
);
const distRoot = join(projectRoot, "dist");

await access(join(distRoot, "index.html"));

const server = await createStaticServer(distRoot);
const browser = await launchInstalledBrowser();

try {
  const context = await browser.newContext();

  await context.route("https://dummyjson.com/**", route => {
    if (process.env.VELODOM_BROWSER_E2E_DEBUG === "1") {
      console.log(`[browser:route] ${route.request().url()}`);
    }

    route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(createDemoResponse(route.request().url()))
    });
  });

  const page = await context.newPage();

  if (process.env.VELODOM_BROWSER_E2E_DEBUG === "1") {
    page.on("console", message => {
      console.log(`[browser:${message.type()}] ${message.text()}`);
    });
    page.on("pageerror", error => {
      console.log(`[browser:error] ${error.message}`);
    });
  }

  await assertStaticSeo(server.origin);
  await assertRouting(page, server.origin);
  await assertFormRequest(page, server.origin);

  await context.close();
  console.log("VeloDom browser E2E smoke check passed.");
} finally {
  await browser.close();
  server.close();
}

async function launchInstalledBrowser() {
  const errors = [];

  if (process.env.VELODOM_BROWSER) {
    try {
      return await chromium.launch({
        executablePath: process.env.VELODOM_BROWSER,
        headless: true
      });
    } catch (error) {
      errors.push(`VELODOM_BROWSER: ${error.message}`);
    }
  }

  for (const channel of [
    "chrome",
    "msedge"
  ]) {
    try {
      return await chromium.launch({
        channel,
        headless: true
      });
    } catch (error) {
      errors.push(`${channel}: ${error.message}`);
    }
  }

  throw new Error([
    "No local Chrome or Edge browser could be launched for E2E tests.",
    "Install Chrome/Edge or set VELODOM_BROWSER to a Chromium-family executable.",
    ...errors.map(error => `- ${error}`)
  ].join("\n"));
}

async function assertStaticSeo(origin) {
  const html = await fetchText(`${origin}/features/`);

  assertIncludes(html, "<title>VeloDom Framework Features</title>");
  assertIncludes(
    html,
    'name="description" content="Try working examples of VeloDom reactive state, directives, components, lifecycle hooks, routing, and requests."'
  );
  assertIncludes(html, "data-vd-seo-fallback");
  assertIncludes(html, "VeloDom framework features");
}

async function assertRouting(page, origin) {
  await page.goto(`${origin}/`);
  await waitForPageText(page, "E2E Browser Post");

  await page.click('a[href="/features"]');
  await page.waitForURL(`${origin}/features`);
  await waitForPageText(page, "Framework features");
}

async function assertFormRequest(page, origin) {
  await page.goto(`${origin}/blog/posts/create`);
  await waitForPageText(page, "Create a post");
  await waitForPageText(page, "Untitled post");

  if (process.env.VELODOM_BROWSER_E2E_DEBUG === "1") {
    console.log(await page.locator("form").evaluate(form => form.outerHTML));
  }

  await page.locator("form").evaluate(form => {
    const title = form.querySelector('[name="title"]');
    const body = form.querySelector('[name="body"]');
    const tags = form.querySelector('[name="tags"]');

    title.value = "E2E Browser Draft";
    body.value = "Created by the real-browser VeloDom smoke test.";
    tags.value = "e2e, browser";

    for (const input of [
      title,
      body,
      tags
    ]) {
      input.dispatchEvent(new Event("input", {
        bubbles: true
      }));
    }
  });
  await page.locator("form").dispatchEvent("submit");
  await waitForPageText(page, "Created post #101");
}

async function waitForPageText(page, text) {
  try {
    await page.waitForFunction(expected => (
      document.body.innerText.includes(expected)
    ), text);
  } catch (error) {
    const body = await page.evaluate(() => document.body.innerText);

    throw new Error([
      `Timed out waiting for page text: ${text}`,
      `Current URL: ${page.url()}`,
      `Current body: ${body.slice(0, 1000)}`,
      error.message
    ].join("\n"), {
      cause: error
    });
  }
}

function createDemoResponse(rawUrl) {
  const url = new URL(rawUrl);

  if (url.pathname === "/posts/add") {
    return {
      id: 101,
      title: "E2E Browser Draft",
      body: "Created by the real-browser VeloDom smoke test.",
      tags: [
        "e2e",
        "browser"
      ]
    };
  }

  if (url.pathname === "/posts/tag-list") {
    return [
      "e2e",
      "browser",
      "html-first"
    ];
  }

  if (url.pathname.startsWith("/posts/")) {
    return createDemoPost(Number(url.pathname.split("/").at(-1)) || 1);
  }

  return {
    posts: [
      createDemoPost(1),
      createDemoPost(2)
    ]
  };
}

function createDemoPost(id) {
  return {
    id,
    title: id === 1
      ? "E2E Browser Post"
      : `E2E Browser Post ${id}`,
    body: "This post was served by the browser E2E request fixture.",
    tags: [
      "e2e",
      "velodom"
    ],
    views: 42
  };
}

async function createStaticServer(root) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const file = await resolveStaticFile(root, url.pathname);
      const source = await readFile(file);

      response.writeHead(200, {
        "content-type": getContentType(file)
      });
      response.end(source);
    } catch {
      response.writeHead(404, {
        "content-type": "text/plain; charset=utf-8"
      });
      response.end("Not found");
    }
  });

  await new Promise(resolvePromise => {
    server.listen(0, "127.0.0.1", resolvePromise);
  });

  const address = server.address();

  return {
    close() {
      server.close();
    },
    origin: `http://127.0.0.1:${address.port}`
  };
}

async function resolveStaticFile(root, pathname) {
  const safePath = decodeURIComponent(pathname)
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");
  const rootPath = resolve(root);
  const candidate = resolve(root, safePath);

  if (!candidate.startsWith(`${rootPath}${sep}`) && candidate !== rootPath) {
    throw new Error("Unsafe static path");
  }

  const files = pathname.endsWith("/")
    ? [
      join(candidate, "index.html"),
      join(root, "index.html")
    ]
    : [
      candidate,
      join(candidate, "index.html"),
      join(root, "index.html")
    ];

  for (const file of files) {
    try {
      const info = await stat(file);

      if (info.isFile()) {
        return file;
      }
    } catch {
      // Try the next static candidate.
    }
  }

  throw new Error(`Static file not found: ${pathname}`);
}

function getContentType(file) {
  switch (extname(file)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

async function fetchText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Expected ${url} to load, got ${response.status}`);
  }

  return response.text();
}

function assertIncludes(value, expected) {
  if (!value.includes(expected)) {
    throw new Error(`Expected output to include: ${expected}`);
  }
}
