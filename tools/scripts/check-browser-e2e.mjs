/**
 * ----------------------------------------
 * Module: Browser E2E Smoke Test
 * ----------------------------------------
 *
 * Serves the production build and drives real local browsers through the V1
 * VeloDom site routes, request examples, one-file pages, and static SEO
 * fallback checks.
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
import {
  chromium,
  devices,
  firefox,
  webkit
} from "@playwright/test";

const projectRoot = resolve(
  fileURLToPath(new URL("../..", import.meta.url))
);
const distRoot = join(projectRoot, "examples", "blog", "dist");
const strictBrowserMatrix = process.env.VELODOM_BROWSER_STRICT === "1";
const debugBrowserE2e = process.env.VELODOM_BROWSER_E2E_DEBUG === "1";
const targetRegistry = createTargetRegistry();
const selectedTargets = getSelectedTargets(targetRegistry);

await access(join(distRoot, "index.html"));

const server = await createStaticServer(distRoot);
const results = [];

try {
  await assertStaticSeo(server.origin);

  for (const target of selectedTargets) {
    results.push(await runBrowserTarget(target, server.origin));
  }

  printBrowserSummary(results);

  const failed = results.filter(result => result.status === "failed");
  const passed = results.filter(result => result.status === "passed");

  if (failed.length > 0) {
    throw new Error(
      `VeloDom browser E2E failed for: ${failed.map(result => result.name).join(", ")}`
    );
  }

  if (passed.length === 0) {
    throw new Error(
      "No browser E2E target ran. Install Chrome/Edge or Playwright browsers."
    );
  }
} finally {
  server.close();
}

function createTargetRegistry() {
  const iphone = devices["iPhone 13"];

  return Object.freeze({
    chromium: Object.freeze({
      name: "chromium",
      label: "Chromium/Chrome/Edge desktop",
      required: true,
      launch: launchInstalledChromium,
      contextOptions: {}
    }),
    firefox: Object.freeze({
      name: "firefox",
      label: "Firefox desktop",
      required: false,
      launch: () => firefox.launch({
        headless: true
      }),
      contextOptions: {}
    }),
    webkit: Object.freeze({
      name: "webkit",
      label: "WebKit desktop",
      required: false,
      launch: () => webkit.launch({
        headless: true
      }),
      contextOptions: {}
    }),
    "mobile-webkit": Object.freeze({
      name: "mobile-webkit",
      label: "Mobile WebKit viewport",
      required: false,
      launch: () => webkit.launch({
        headless: true
      }),
      contextOptions: iphone
        ? {
          ...iphone
        }
        : {
          hasTouch: true,
          isMobile: true,
          userAgent: "VeloDom Mobile WebKit E2E",
          viewport: {
            width: 390,
            height: 844
          }
        }
    })
  });
}

function getSelectedTargets(registry) {
  const requested = process.env.VELODOM_BROWSER_TARGETS
    ? process.env.VELODOM_BROWSER_TARGETS.split(",")
      .map(value => value.trim())
      .filter(Boolean)
    : Object.keys(registry);

  const unknown = requested.filter(name => !registry[name]);

  if (unknown.length > 0) {
    throw new Error([
      `Unknown browser E2E target(s): ${unknown.join(", ")}`,
      `Supported targets: ${Object.keys(registry).join(", ")}`
    ].join("\n"));
  }

  return requested.map(name => registry[name]);
}

async function runBrowserTarget(target, origin) {
  let browser;

  try {
    browser = await target.launch();
  } catch (error) {
    if (!target.required && !strictBrowserMatrix) {
      return {
        name: target.name,
        label: target.label,
        reason: getLaunchFailureMessage(error),
        status: "skipped"
      };
    }

    return {
      name: target.name,
      error,
      label: target.label,
      status: "failed"
    };
  }

  try {
    await assertNoJavaScriptSeo(browser, target, origin);
    await assertInteractiveSmoke(browser, target, origin);

    return {
      name: target.name,
      label: target.label,
      status: "passed"
    };
  } catch (error) {
    return {
      name: target.name,
      error,
      label: target.label,
      status: "failed"
    };
  } finally {
    await browser.close();
  }
}

async function launchInstalledChromium() {
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

  try {
    return await chromium.launch({
      headless: true
    });
  } catch (error) {
    errors.push(`playwright chromium: ${error.message}`);
  }

  throw new Error([
    "No local Chromium, Chrome, or Edge browser could be launched for E2E tests.",
    "Install Chrome/Edge, install Playwright browsers, or set VELODOM_BROWSER.",
    ...errors.map(error => `- ${error}`)
  ].join("\n"));
}

async function assertNoJavaScriptSeo(browser, target, origin) {
  const context = await browser.newContext({
    ...target.contextOptions,
    javaScriptEnabled: false
  });

  try {
    const page = await context.newPage();

    await page.goto(`${origin}/features/`);
    await waitForPageText(page, "VeloDom framework features");

    const fallbackCount = await page.locator("[data-vd-seo-fallback]").count();

    if (fallbackCount < 1) {
      throw new Error("Expected no-JavaScript SEO fallback content to be visible.");
    }
  } finally {
    await context.close();
  }
}

async function assertInteractiveSmoke(browser, target, origin) {
  const context = await browser.newContext(target.contextOptions);

  try {
    await runInteractiveStep(context, target, async page => {
      await assertRouting(page, origin);
    });
    await runInteractiveStep(context, target, async page => {
      await assertSingleFilePage(page, origin);
    });
    await runInteractiveStep(context, target, async page => {
      await assertRequestExamples(page, origin);
    });
    await runInteractiveStep(context, target, async page => {
      await assertArticlePage(page, origin);
    });
  } finally {
    await context.close();
  }
}

async function runInteractiveStep(context, target, callback) {
  const page = await context.newPage();

  if (debugBrowserE2e) {
    page.on("console", message => {
      console.log(`[browser:${target.name}:${message.type()}] ${message.text()}`);
    });
    page.on("pageerror", error => {
      console.log(`[browser:${target.name}:error] ${error.message}`);
    });
  }

  try {
    await callback(page);
  } finally {
    await page.close();
  }
}

async function assertStaticSeo(origin) {
  const html = await fetchText(`${origin}/features/`);

  assertIncludes(html, "<title>VeloDom Framework Features</title>");
  assertIncludes(
    html,
    'name="description" content="Try working examples of VeloDom V1 reactive state, directives, components, lifecycle hooks, routing, and local request routes."'
  );
  assertIncludes(html, "data-vd-seo-fallback");
  assertIncludes(html, "VeloDom framework features");
}

async function assertRouting(page, origin) {
  await page.goto(`${origin}/`);
  await waitForPageText(page, "Framework articles");

  await page.click('a[href="/features"]');
  await page.waitForURL(`${origin}/features`);
  await waitForPageText(page, "Framework features");
}

async function assertSingleFilePage(page, origin) {
  await page.goto(`${origin}/single-file`);
  await waitForPageText(page, "One File, VeloDom Style");
  await waitForPageText(page, "Single-file component");

  await page.click('button:has-text("Count: 0")');
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find(candidate => (
      candidate.innerText.includes("Count:")
    ));

    return button?.innerText.includes("1");
  });

  await page.click('button:has-text("Show details")');
  await waitForPageText(page, "single-file-card.vd");
}

async function assertRequestExamples(page, origin) {
  await page.goto(`${origin}/features`);
  await waitForPageText(page, "Requests");
  await waitForPageText(page, "No article loaded yet.");
  await page.locator('[data-vd-request="articles.getOne"]').nth(1).waitFor();

  await page.locator('[data-vd-request="articles.getOne"]').nth(0).dispatchEvent("click");
  await waitForPageText(page, "Loaded: HTML-first is the center of VeloDom");

  await page.locator('[data-vd-request="articles.getOne"]').nth(1).dispatchEvent("click");
  await waitForPageText(page, "Loaded: Compiler-first without hiding the DOM");
}

async function assertArticlePage(page, origin) {
  await page.goto(`${origin}/blog/posts/html-first`);
  await waitForPageText(page, "HTML-first is the center of VeloDom");

  await page.click('button:has-text("Reload through vd-request")');
  await waitForPageText(page, "Declarative reload through");
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

function getLaunchFailureMessage(error) {
  return error instanceof Error
    ? error.message.split("\n").at(0)
    : String(error);
}

function printBrowserSummary(results) {
  console.log("VeloDom browser E2E matrix");
  console.log("==========================");

  results.forEach(result => {
    if (result.status === "passed") {
      console.log(`✓ ${result.label}`);
      return;
    }

    if (result.status === "skipped") {
      console.log(`- ${result.label} skipped: ${result.reason}`);
      return;
    }

    console.log(`✗ ${result.label}: ${result.error.message}`);
  });
}
