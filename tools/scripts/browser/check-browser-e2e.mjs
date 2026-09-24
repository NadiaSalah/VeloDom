/**
 * ----------------------------------------
 * Module: Browser E2E Smoke Test
 * ----------------------------------------
 *
 * Serves the production build and drives real local browsers through the V1
 * VeloDom site routes, request examples, one-file pages, the separate
 * storefront reference consumer, and static SEO fallback checks.
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
  fileURLToPath(new URL("../../..", import.meta.url))
);
// The showcase directory is application-owned and is named explicitly so
// release verification follows the same path used by the build and docs.
const distRoot = join(projectRoot, "examples", "velodom-blog", "dist");
const storeDistRoot = join(projectRoot, "examples", "velodom-store", "dist");
const strictBrowserMatrix = process.env.VELODOM_BROWSER_STRICT === "1";
const debugBrowserE2e = process.env.VELODOM_BROWSER_E2E_DEBUG === "1";
const browserLaunchTimeoutMs = readPositiveDuration(
  process.env.VELODOM_BROWSER_LAUNCH_TIMEOUT_MS,
  20_000
);
const targetRegistry = createTargetRegistry();
const selectedTargets = getSelectedTargets(targetRegistry);

await access(join(distRoot, "index.html"));
await access(join(storeDistRoot, "index.html"));

const server = await createStaticServer(distRoot);
const storeServer = await createStaticServer(storeDistRoot);
const results = [];

try {
  await assertStaticSeo(server.origin, storeServer.origin);

  for (const target of selectedTargets) {
    results.push(await runBrowserTarget(
      target,
      server.origin,
      storeServer.origin
    ));
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
  await server.close();
  await storeServer.close();
}

function createTargetRegistry() {
  const iphone = devices["iPhone 13"];
  const android = devices["Pixel 7"];

  return Object.freeze({
    chromium: Object.freeze({
      name: "chromium",
      label: "Chromium/Chrome/Edge desktop",
      required: true,
      launch: launchInstalledChromium,
      contextOptions: {}
    }),
    "mobile-chromium": Object.freeze({
      name: "mobile-chromium",
      label: "Mobile Chromium viewport",
      required: true,
      launch: launchInstalledChromium,
      contextOptions: android
        ? { ...android }
        : {
          hasTouch: true,
          isMobile: true,
          userAgent: "VeloDom Mobile Chromium E2E",
          viewport: {
            width: 412,
            height: 915
          }
        }
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
    : Object.values(registry)
      .filter(target => target.required)
      .map(target => target.name);

  const unknown = requested.filter(name => !registry[name]);

  if (unknown.length > 0) {
    throw new Error([
      `Unknown browser E2E target(s): ${unknown.join(", ")}`,
      `Supported targets: ${Object.keys(registry).join(", ")}`
    ].join("\n"));
  }

  return requested.map(name => registry[name]);
}

async function runBrowserTarget(target, origin, storeOrigin) {
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
    await assertStorefrontSmoke(browser, target, storeOrigin);

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
  const browserProblems = [];

  page.on("console", message => {
    if (debugBrowserE2e) {
      console.log(`[browser:${target.name}:${message.type()}] ${message.text()}`);
    }
    if (message.type() === "error") {
      browserProblems.push(`console.error: ${message.text()}`);
    }
  });
  page.on("pageerror", error => {
    if (debugBrowserE2e) {
      console.log(`[browser:${target.name}:error] ${error.message}`);
    }
    browserProblems.push(`pageerror: ${error.message}`);
  });
  if (debugBrowserE2e) {
    console.log(`[browser:${target.name}] starting ${name}`);
  }

  try {
    await callback(page);

    await page.waitForFunction(() => {
      const logos = [...document.querySelectorAll("img.site-brand-mark")];
      return logos.length > 0 && logos.every(logo => logo.complete && logo.naturalWidth > 0);
    });
    const overflow = await page.evaluate(() => {
      if (document.documentElement.scrollWidth <= window.innerWidth + 2) return null;
      return {
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll("main, section, article, aside, pre")]
          .filter(element => element.getBoundingClientRect().right > window.innerWidth + 2)
          .slice(0, 6)
          .map(element => ({ tag: element.tagName, id: element.id, width: element.clientWidth }))
      };
    });
    if (overflow) throw new Error(`Page content overflows the viewport horizontally: ${JSON.stringify(overflow)}`);

    if (browserProblems.length > 0) {
      throw new Error([
        "Unexpected browser errors:",
        ...browserProblems.map(problem => `- ${problem}`)
      ].join("\n"));
    }

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

async function assertStaticSeo(origin, storeOrigin) {
  const html = await fetchText(`${origin}/features/`);

  assertIncludes(html, "<title>VeloDom Framework Features</title>");
  assertIncludes(
    html,
    'name="description" content="Study source-level examples of VeloDom V1 reactive state, directives, components, lifecycle hooks, routing, requests, and production tooling."'
  );
  assertIncludes(html, "data-vd-seo-fallback");
  assertIncludes(html, "VeloDom framework features");

  const storeHtml = await fetchText(`${storeOrigin}/products/aurora-lamp/`);

  assertIncludes(storeHtml, "<title>Aurora desk lamp | VeloDom Store</title>");
  assertIncludes(storeHtml, "data-vd-seo-fallback");
  assertIncludes(storeHtml, "A dimmable task light with a small footprint.");
}

async function assertStorefrontSmoke(browser, target, origin) {
  const context = await browser.newContext(target.contextOptions);

  try {
    await runInteractiveStep(context, target, "storefront", async page => {
      await page.goto(`${origin}/?category=workspace&sort=price-asc`);
      await waitForPageText(page, "A real storefront flow");
      await waitForPageText(page, "Focus dial timer");
      await page.waitForFunction(() => {
        const titles = [...document.querySelectorAll(".product-card h2")]
          .map(node => node.textContent?.trim());

        return titles.join("|") === "Focus dial timer|Aurora desk lamp";
      });

      await page.locator('a.category-link:has-text("Carry")').click();
      await page.waitForURL(url => url.searchParams.get("category") === "carry");
      await waitForPageText(page, "Canvas day pack");
      await page.goBack();
      await page.waitForURL(url => url.searchParams.get("category") === "workspace");
      await waitForPageText(page, "Focus dial timer");
      await page.goForward();
      await page.waitForURL(url => url.searchParams.get("category") === "carry");
      await waitForPageText(page, "Canvas day pack");

      await page.goto(`${origin}/products/aurora-lamp`);
      await waitForPageText(page, "Aurora desk lamp");
      const addButton = page.locator('button:has-text("Add to cart")');

      await addButton.focus();
      await addButton.press("Enter");
      await waitForPageText(page, "Added after a fresh mock stock and price check.");
      await page.reload();
      await page.waitForFunction(() => (
        document.querySelector(".cart-badge")?.textContent?.trim() === "1"
      ));

      await page.locator('a.primary-link[href="/cart"]').click();
      await waitForPageText(page, "Confirmed items");
      await waitForPageText(page, "Aurora desk lamp");
      await page.locator('a[href="/checkout"]').click();
      await waitForPageText(page, "No payment can occur here.");
      await page.locator('button:has-text("Complete mock handoff")').click();
      await waitForPageText(page, "No order was created and no payment was taken.");

      await page.locator(".locale-button").click();
      await page.waitForFunction(() => (
        document.documentElement.dir === "rtl"
        && document.documentElement.lang === "ar"
      ));
    });

    await context.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new Error("storage blocked by browser policy");
      };
    });
    await runInteractiveStep(context, target, "storefront-storage-failure", async page => {
      await page.goto(`${origin}/products/focus-timer`);
      await waitForPageText(page, "Focus dial timer");
      await page.locator('button:has-text("Add to cart")').click();
      await waitForPageText(
        page,
        "Cart changes remain in this tab because browser storage is unavailable."
      );
    });
  } finally {
    await context.close();
  }
}

async function assertRouting(page, origin) {
  await page.goto(`${origin}/`);
  await waitForPageText(page, "From your first page to production boundaries.");
  await waitForPageText(page, "One page. Two files. One interaction.");
  const firstLesson = await page.locator('section[aria-labelledby="first-feature"] pre code').allTextContents();
  if (firstLesson.length !== 2 || !firstLesson[0].includes("{{ count }}") || !firstLesson[1].includes("state.increment")) {
    throw new Error("Homepage teaching snippets must remain readable literal code.");
  }

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
  await page.goto(`${origin}/playground`);
  await waitForPageText(page, "Read the HTML, then use the feature.");

  const bindingToggle = page.locator('[data-demo-action="binding-toggle"]');
  await page.waitForFunction(() => (
    document.querySelector('[data-demo-action="binding-toggle"]')?.getAttribute("aria-pressed") === "false"
  ));
  await bindingToggle.click();
  await page.waitForFunction(() => (
    document.querySelector('[data-demo-action="binding-toggle"]')?.getAttribute("aria-pressed") === "true"
    && document.querySelector('[data-demo-binding-preview]')?.style.getPropertyValue("--BrandColor") === "#047857"
  ));
  await bindingToggle.click();
  await page.waitForFunction(() => (
    document.querySelector('[data-demo-action="binding-toggle"]')?.getAttribute("aria-pressed") === "false"
    && document.querySelector('[data-demo-binding-preview]')?.style.backgroundColor === ""
    && document.querySelector('[data-demo-binding-preview]')?.style.getPropertyValue("--BrandColor") === ""
  ));

  await page.locator('[data-demo-action="state-increment"]').click();
  await page.waitForFunction(() => (
    document.querySelector('[data-demo-action="state-increment"]')
      ?.textContent?.includes("Count: 1")
  ));

  await page.locator('#component [data-demo-action="component-increment"]').click();
  await page.waitForFunction(() => (
    document.querySelector(".counter-panel-value")?.textContent?.includes("Count: 1")
  ));
  await page.locator('[data-demo-action="component-reset"]').click();
  await page.waitForFunction(() => (
    document.querySelector(".counter-panel-value")?.textContent?.includes("Count: 0")
  ));

  await waitForPageText(page, "Loop scope: First");
  await waitForPageText(page, "Loop scope: Second");
  const firstLoopPanel = page.locator("#loop-components .counter-panel")
    .filter({ hasText: "Loop scope: First" });

  await firstLoopPanel.evaluate(node => {
    node.setAttribute("data-e2e-stable-loop-item", "first");
  });
  await firstLoopPanel
    .locator('[data-demo-action="component-increment"]')
    .click();
  await page.locator('[data-demo-action="loop-components-reorder"]').click();
  await page.waitForFunction(() => {
    const section = document.querySelector("#loop-components");
    const titles = [...section?.querySelectorAll(".counter-panel h3") || []]
      .map(node => node.textContent?.trim());
    const preserved = section?.querySelector(
      '[data-e2e-stable-loop-item="first"]'
    );

    return titles.join("|") === "Loop scope: Second|Loop scope: First"
      && preserved?.textContent?.includes("Count: 1");
  });
  await page.locator('[data-demo-action="loop-components-replace"]').click();
  await waitForPageText(page, "Loop scope: Updated");
  await page.waitForFunction(() => (
    !document.body.innerText.includes("Loop scope: First")
    && !document.body.innerText.includes("Loop scope: Second")
    && [...document.querySelectorAll(".counter-panel h3")]
      .filter(node => node.textContent?.includes("Loop scope:")).length === 1
  ));

  await page.locator('[data-demo-action="list-success"]').waitFor();
  await page.locator('[data-demo-action="list-success"]').click();
  await waitForPageText(page, "HTML-first is the center of VeloDom");
  await page.locator('[data-demo-action="list-empty"]').click();
  await waitForPageText(page, "No articles found.");
  await page.waitForFunction(() => (
    document.querySelector('[data-demo-list-success]')?.style.display === "none"
  ));
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
  // Browser launch failures can leave keep-alive sockets around briefly. The
  // server must never keep a completed release gate alive on its own.
  server.unref();

  const address = server.address();

  return {
    async close() {
      await new Promise((resolvePromise, rejectPromise) => {
        server.close(error => {
          if (error) {
            rejectPromise(error);
            return;
          }

          resolvePromise();
        });
        server.closeAllConnections?.();
      });
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
