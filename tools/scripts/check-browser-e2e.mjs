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
const browserLaunchTimeoutMs = readPositiveDuration(
  process.env.VELODOM_BROWSER_LAUNCH_TIMEOUT_MS,
  20_000
);
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
        headless: true,
        timeout: browserLaunchTimeoutMs
      }),
      contextOptions: {}
    }),
    webkit: Object.freeze({
      name: "webkit",
      label: "WebKit desktop",
      required: false,
      launch: () => webkit.launch({
        headless: true,
        timeout: browserLaunchTimeoutMs
      }),
      contextOptions: {}
    }),
    "mobile-webkit": Object.freeze({
      name: "mobile-webkit",
      label: "Mobile WebKit viewport",
      required: false,
      launch: () => webkit.launch({
        headless: true,
        timeout: browserLaunchTimeoutMs
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
    if (debugBrowserE2e) {
      console.log(
        `[browser:${target.name}] launching with ${browserLaunchTimeoutMs}ms timeout`
      );
    }

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
        headless: true,
        timeout: browserLaunchTimeoutMs
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
        headless: true,
        timeout: browserLaunchTimeoutMs
      });
    } catch (error) {
      errors.push(`${channel}: ${error.message}`);
    }
  }

  try {
    return await chromium.launch({
      headless: true,
      timeout: browserLaunchTimeoutMs
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
    await assertStaticPageText(page, "VeloDom framework features");

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
    await runInteractiveStep(context, target, "routing", async page => {
      await assertRouting(page, origin);
    });
    await runInteractiveStep(context, target, "single-file", async page => {
      await assertSingleFilePage(page, origin);
    });
    await runInteractiveStep(context, target, "requests", async page => {
      await assertRequestExamples(page, origin);
    });
    await runInteractiveStep(context, target, "article", async page => {
      await assertArticlePage(page, origin);
    });
    await runInteractiveStep(context, target, "reference-sidebar", async page => {
      await assertReferenceSidebar(page, origin);
    });
  } finally {
    await context.close();
  }

  await assertCompactDesktopNavigation(browser, target, origin);
}

async function runInteractiveStep(context, target, name, callback) {
  const page = await context.newPage();

  if (debugBrowserE2e) {
    console.log(`[browser:${target.name}] starting ${name}`);
    page.on("console", message => {
      console.log(`[browser:${target.name}:${message.type()}] ${message.text()}`);
    });
    page.on("pageerror", error => {
      console.log(`[browser:${target.name}:error] ${error.message}`);
    });
  }

  try {
    await callback(page);

    if (debugBrowserE2e) {
      console.log(`[browser:${target.name}] completed ${name}`);
    }
  } catch (error) {
    const body = await page.locator("body").innerText().catch(() => "");

    throw new Error([
      `Browser step failed: ${name}`,
      `Current URL: ${page.url()}`,
      `Current body: ${body.slice(0, 1000)}`,
      error instanceof Error ? error.message : String(error)
    ].join("\n"), {
      cause: error
    });
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
  await waitForPageText(page, "From your first page to production boundaries.");

  // The desktop navigation is intentionally hidden at mobile breakpoints.
  // Use the visible course CTA so this assertion follows the same route a
  // mobile visitor can actually activate while still covering hash navigation.
  await page.click('a[href="/features#pages"]:visible');
  await page.waitForURL(`${origin}/features#pages`);
  await waitForPageText(page, "Learn each capability from code.");
  await page.waitForFunction(() => (
    [...document.querySelectorAll('.site-primary-link.is-active')]
      .some(link => link.getAttribute("href") === "/features"
        && link.getAttribute("aria-current") === "page")
  ));

  await page.waitForFunction(() => {
    const active = document.querySelector(".docs-sidebar-link.is-active");

    return active?.getAttribute("href") === "/features#pages"
      && active?.getAttribute("aria-current") === "location";
  });

  await page.goto(`${origin}/features#quality`);
  await page.waitForFunction(() => (
    document.querySelector('.docs-sidebar-link.is-active')
      ?.getAttribute("href") === "/features#quality"
  ));

  await page.locator('a[href="/features#directives"]').click();
  await page.waitForURL(`${origin}/features#directives`);
  await page.waitForFunction(() => (
    document.querySelector('.docs-sidebar-link.is-active')
      ?.getAttribute("href") === "/features#directives"
  ));

  await page.locator("#tooling").evaluate(element => {
    element.scrollIntoView({ block: "center", behavior: "auto" });
  });
  await page.waitForFunction(() => (
    document.querySelector('.docs-sidebar-link.is-active')
      ?.getAttribute("href") === "/features#tooling"
  ));

  const codeExamples = await page.locator("pre.code-example > code").count();

  if (codeExamples < 8) {
    throw new Error("Expected the academic reference to expose its code examples.");
  }
}

async function assertSingleFilePage(page, origin) {
  await page.goto(`${origin}/single-file`);
  await waitForPageText(page, "One file when co-location improves clarity.");
  await waitForPageText(page, "A `.vd` file compiles to the same internal resource shape.");

  await page.click('button:has-text("Live count: 0")');
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find(candidate => (
      candidate.innerText.includes("Live count:")
    ));

    return button?.innerText.includes("1");
  });
}

async function assertRequestExamples(page, origin) {
  await page.goto(`${origin}/features`);
  await waitForPageText(page, "Requests and forms");
  await page.locator('[data-vd-request="articles.getOne"]').nth(1).waitFor();

  await page.locator('[data-vd-request="articles.getOne"]').nth(0).click();
  await waitForPageText(page, "HTML-first is the center of VeloDom");

  await page.locator('[data-vd-request="articles.getOne"]').nth(1).click();
  await waitForPageText(page, "Compiler-first without hiding the DOM");
}

async function assertArticlePage(page, origin) {
  await page.goto(`${origin}/blog/posts/html-first`);
  await waitForPageText(page, "HTML-first is the center of VeloDom");

  await page.click('button:has-text("Reload lesson")');
  await waitForPageText(page, "HTML-first is the center of VeloDom");
}

async function assertReferenceSidebar(page, origin) {
  await page.goto(`${origin}/reference#runtime`);
  await waitForPageText(page, "One public contract, organized by purpose.");
  await page.waitForFunction(() => (
    document.querySelector('.docs-sidebar-link.is-active')
      ?.getAttribute("href") === "/reference#runtime"
  ));

  await page.locator('a[href="/reference#compiler"]').click();
  await page.waitForURL(`${origin}/reference#compiler`);
  await page.waitForFunction(() => (
    document.querySelector('.docs-sidebar-link.is-active')
      ?.getAttribute("href") === "/reference#compiler"
  ));

  await page.locator("#cli").evaluate(element => {
    element.scrollIntoView({ block: "center", behavior: "auto" });
  });
  await page.waitForFunction(() => (
    document.querySelector('.docs-sidebar-link.is-active')
      ?.getAttribute("href") === "/reference#cli"
  ));
}

/**
 * Verifies that the compact navigation remains usable below the wide desktop
 * breakpoint. The horizontal navigation is intentionally hidden there, so a
 * visible native menu must keep every documentation route reachable.
 */
async function assertCompactDesktopNavigation(browser, target, origin) {
  const context = await browser.newContext({
    ...target.contextOptions,
    viewport: {
      width: 900,
      height: 700
    }
  });

  try {
    await runInteractiveStep(context, target, "compact-navigation", async page => {
      await page.goto(`${origin}/`);
      await waitForPageText(page, "From your first page to production boundaries.");

      const menu = page.locator("details.dropdown summary");

      await menu.click();
      await page.locator('details.dropdown a[href="/reference"]').click();
      await page.waitForURL(`${origin}/reference`);
      await waitForPageText(page, "One public contract, organized by purpose.");
      await page.waitForFunction(() => (
        [...document.querySelectorAll('.site-primary-link.is-active')]
          .some(link => link.getAttribute("href") === "/reference"
            && link.getAttribute("aria-current") === "page")
      ));
    });
  } finally {
    await context.close();
  }
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

/**
 * Verifies prerendered fallback text without evaluating code in the page.
 * JavaScript is intentionally disabled for this SEO check, so Playwright's
 * page-side wait helpers would never be evaluated in Chromium or Firefox.
 */
async function assertStaticPageText(page, text) {
  const body = await page.locator("body").innerText();

  if (!body.includes(text)) {
    throw new Error([
      `Expected static page text: ${text}`,
      `Current URL: ${page.url()}`,
      `Current body: ${body.slice(0, 1000)}`
    ].join("\n"));
  }
}

/**
 * Parses an optional browser-launch timeout without allowing a malformed
 * environment value to make release verification wait indefinitely.
 */
function readPositiveDuration(value, fallback) {
  if (value === undefined || value === "") return fallback;

  const duration = Number(value);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(
      "VELODOM_BROWSER_LAUNCH_TIMEOUT_MS must be a positive millisecond value."
    );
  }

  return Math.floor(duration);
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
