/**
 * ----------------------------------------
 * Module: Browser E2E Smoke Test
 * ----------------------------------------
 *
 * Serves the production build and drives real local browsers through the V1
 * VeloDom site routes, request examples, one-file pages, the separate
 * storefront/admin reference consumer, and static SEO fallback checks.
 * ----------------------------------------
 */

import {
  access,
  readdir,
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
import { createStoreBackendFixture } from "../../../examples/velodom-store/server/backend-fixture.js";
import { handleStoreBackendNodeRequest } from "../../../examples/velodom-store/server/node-backend.js";
import { formatBrowserFailureAnnotations } from "./ci-annotations.mjs";

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
await assertStoreBrowserBoundary(storeDistRoot);

const server = await createStaticServer(distRoot);
const storeBackend = createStoreBackendFixture();
const storeServer = await createStaticServer(
  storeDistRoot,
  (request, response) => handleStoreBackendNodeRequest(
    request,
    response,
    storeBackend
  )
);
const results = [];

try {
  await assertStaticSeo(server.origin, storeServer.origin);

  for (const target of selectedTargets) {
    storeBackend.reset();
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
    if (process.env.GITHUB_ACTIONS === "true") {
      for (const annotation of formatBrowserFailureAnnotations(failed)) {
        console.log(annotation);
      }
    }

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
    await runInteractiveStep(context, target, "native-form-recipes", async page => {
      await assertNativeFormRecipes(page, origin);
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

async function runInteractiveStep(context, target, name, callback, options = {}) {
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

    const unexpectedBrowserProblems = browserProblems.filter(problem => (
      !(options.expectedConsoleErrors || []).some(expected => (
        problem.includes(expected)
      ))
    ));

    if (unexpectedBrowserProblems.length > 0) {
      throw new Error([
        "Unexpected browser errors:",
        ...unexpectedBrowserProblems.map(problem => `- ${problem}`)
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

  const adminHtml = await fetchText(`${storeOrigin}/admin/products/`);

  assertIncludes(adminHtml, "<title>Product Administration | VeloDom Store</title>");
  assertIncludes(adminHtml, 'name="robots" content="noindex,nofollow"');
}

async function assertStoreBrowserBoundary(root) {
  const entries = await readdir(join(root, "assets"), {
    withFileTypes: true
  });
  const javascript = await Promise.all(entries
    .filter(entry => entry.isFile() && entry.name.endsWith(".js"))
    .map(entry => readFile(join(root, "assets", entry.name), "utf8")));
  const source = javascript.join("\n");

  for (const forbidden of [
    "velodom-store-server-fixture-secret-not-for-browser",
    "node:crypto",
    "SERVER_SIGNING_SECRET"
  ]) {
    if (source.includes(forbidden)) {
      throw new Error(`Store browser build leaked server-only marker: ${forbidden}`);
    }
  }
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
      await page.goto(`${origin}/sign-in?returnTo=/checkout&reason=checkout`);
      await waitForPageText(page, "Choose a fixture account.");
      await page.locator(".locale-button").waitFor();
      await page.locator('button:has-text("North customer")').click();
      await waitForPageText(page, "Signed in as Casey Customer");
      await page.locator('a:has-text("Continue")').click();
      await waitForPageText(page, "No payment can occur here.");
      await page.locator('button:has-text("Create mock order")').click();
      await waitForPageText(page, "No charge or payment provider was used.");
      await waitForPageText(page, "Payment status: not-charged");

      await page.locator(".locale-button").click();
      await page.waitForFunction(() => (
        document.documentElement.dir === "rtl"
        && document.documentElement.lang === "ar"
      ));
    });

    await runInteractiveStep(context, target, "storefront-navigation-cancellation", async page => {
      await page.goto(`${origin}/`);
      await page.locator(".locale-button").waitFor();
      let markStarted;
      let release;
      let markFinished;
      const started = new Promise(resolve => { markStarted = resolve; });
      const gate = new Promise(resolve => { release = resolve; });
      const finished = new Promise(resolve => { markFinished = resolve; });
      await page.route("**/__fixture-api/catalog?**", async route => {
        if (new URL(route.request().url()).searchParams.get("category") !== "carry") {
          await route.continue();
          return;
        }
        markStarted();
        await gate;
        try {
          await route.fulfill({ json: { items: [], categories: [], total: 0 } });
        } catch (error) {
          // Forwarded AbortSignal can cancel the intercepted request entirely.
          if (!route.request().failure()) throw error;
        } finally { markFinished(); }
      });
      try {
        await page.locator('a.category-link:has-text("Carry")').click();
        await started;
        // Preparation leaves the mounted header usable while data is loading.
        await page.locator('a.primary-link[href="/cart"]').click();
        await page.waitForURL(`${origin}/cart`);
        await page.locator(".locale-button").waitFor();
        await waitForPageText(page, "Your guest cart.");
        release();
        await finished;
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        if ((await page.locator("h1").textContent())?.trim() !== "Your guest cart.") {
          throw new Error("A cancelled catalog read replaced the newer cart page.");
        }
      } finally {
        release();
        await page.unrouteAll({ behavior: "wait" });
      }
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
    await runInteractiveStep(
      context,
      target,
      "storefront-administration",
      async page => {
        await page.goto(`${origin}/admin/products`);
        await page.waitForURL(url => url.pathname === "/sign-in");
        await waitForPageText(page, "Choose a fixture account.");
        await page.locator(".locale-button").waitFor();
        await page.locator('button:has-text("North administrator")').click();
        await waitForPageText(page, "Signed in as Nora Admin");
        await page.locator('a:has-text("Continue")').click();
        await waitForPageText(page, "Search a server-paginated list");
        // The SEO fallback can expose page text before the async page module and
        // its model bindings finish mounting. The shared component appears only
        // after page directives are ready, so it is the deterministic UI gate.
        await page.locator(".locale-button").waitFor();
        await page.locator("#admin-search").fill("workspace");
        await page.waitForFunction(() => (
          document.querySelector("#admin-search")?.value === "workspace"
        ));
        const submittedForm = await page.locator("form.admin-filters").evaluate(form => {
          const input = document.querySelector("#admin-search");

          return {
            entries: [...new FormData(form).entries()],
            inputName: input?.getAttribute("name"),
            inputValue: input?.value,
            ownsInput: input?.form === form
          };
        });
        if (submittedForm.entries.find(([name]) => name === "q")?.[1] !== "workspace") {
          throw new Error(
            `Admin search form lost its query before submit: ${JSON.stringify(submittedForm)}`
          );
        }
        await page.locator('button:has-text("Search")').click();
        await page.waitForURL(url => url.searchParams.get("q") === "workspace");
        await page.waitForFunction(() => (
          document.querySelectorAll(".admin-table tbody tr").length === 2
        ));

        await page.locator('a[href="/admin/products/focus-timer/edit"]').click();
        await waitForPageText(page, "Edit Focus dial timer");
        await page.locator(".locale-button").waitFor();
        const nameInput = page.locator("#product-name");

        await nameInput.fill("Focus recovery timer");
        await waitForPageText(page, "Unsaved Changes");
        const blockedLink = page.locator('a:has-text("Cancel")').click();
        const leavePrompt = await page.waitForEvent("dialog");
        if (leavePrompt.type() !== "confirm" || !leavePrompt.message().includes("unsaved product changes")) {
          throw new Error("Dirty edit did not expose an explicit discard decision.");
        }
        await leavePrompt.dismiss();
        await blockedLink;
        if (new URL(page.url()).pathname !== "/admin/products/focus-timer/edit") {
          throw new Error("Dismissing the unsaved-edit prompt still left the edit page.");
        }
        if (await nameInput.inputValue() !== "Focus recovery timer") {
          throw new Error("Blocked navigation lost the unsaved product draft.");
        }
        await page.locator('select[name="mode"]').selectOption("error");
        await page.locator('button:has-text("Save product")').click();
        await waitForPageText(page, "Your draft is still available.");
        if (await nameInput.inputValue() !== "Focus recovery timer") {
          throw new Error("A failed admin write erased the user's draft.");
        }
        await page.waitForFunction(() => document.activeElement?.id === "save-error");

        await page.locator('select[name="mode"]').selectOption("conflict");
        await page.locator('button:has-text("Save product")').click();
        await waitForPageText(page, "Your draft was preserved");
        if (await nameInput.inputValue() !== "Focus recovery timer") {
          throw new Error("A conflicting admin write erased the user's draft.");
        }

        await page.locator('button:has-text("Reload server version")').click();
        await waitForPageText(page, "Reloaded revision 2");
        if (await nameInput.inputValue() !== "Focus dial timer") {
          throw new Error("Reload did not restore the authoritative server value.");
        }

        await nameInput.fill("Focus recovery timer");
        const saveWrite = page.waitForRequest(request => (
          request.method() === "PUT"
          && new URL(request.url()).pathname
            === "/__fixture-api/admin/products/focus-timer"
        ));
        await page.locator('button:has-text("Save product")').click();
        const saveRequest = await saveWrite;
        const submittedProduct = saveRequest.postDataJSON();
        if (submittedProduct.name !== "Focus recovery timer") {
          throw new Error(
            `Admin form submitted a stale name: ${JSON.stringify(submittedProduct.name)}.`
          );
        }
        const saveResponse = await saveRequest.response();
        if (!saveResponse?.ok()) {
          throw new Error(`Admin save did not return success: ${saveResponse?.status() ?? "no response"}.`);
        }
        const acceptedSave = await saveResponse.json();
        if (acceptedSave.product?.name !== "Focus recovery timer") {
          throw new Error(
            `Admin save response contained a stale name: ${JSON.stringify(acceptedSave.product?.name)}.`
          );
        }
        await waitForPageText(page, "saved as revision 3");
        await page.waitForFunction(() => document.activeElement?.id === "save-status");
        // A successful write is not enough: the private detail route must
        // perform a fresh server read before presenting the saved record.
        const detailRead = page.waitForRequest(request => (
          request.method() === "GET"
          && new URL(request.url()).pathname
            === "/__fixture-api/admin/products/focus-timer"
        ));
        await page.locator('a:has-text("Cancel")').click();
        const detailRequest = await detailRead;
        const detailResponse = await detailRequest.response();
        if (!detailResponse) {
          throw new Error("Admin detail request ended without a response after save.");
        }
        if (!detailResponse.ok()) {
          throw new Error(`Admin detail read failed after save: ${detailResponse.status()}`);
        }
        const savedDetail = await detailResponse.json();
        if (savedDetail.name !== "Focus recovery timer") {
          throw new Error(
            `Admin detail read returned a stale product after save: name ${JSON.stringify(savedDetail.name)}, revision ${savedDetail.revision}, `
            + `cache-control ${detailResponse.headers()["cache-control"] || "absent"}, `
            + `service worker ${detailResponse.fromServiceWorker()}.`
          );
        }
        await page.locator("main.admin-page .admin-heading h1")
          .filter({ hasText: "Focus recovery timer" })
          .waitFor();
        await page.locator('a:has-text("Product administration")').click();
        await waitForPageText(page, "Server-paginated product records");
        // The static table caption appears before async directives are bound.
        // Wait for the same mounted-component gate used by the initial list.
        await page.locator(".locale-button").waitFor();

        const firstRow = page.locator(".admin-table tbody tr").first();
        const previousStatus = await firstRow.locator(".status-badge").innerText();
        let bulkWrites = 0;
        let failNextRead = true;
        const listPattern = "**/__fixture-api/admin/products**";
        await page.route(listPattern, async route => {
          const request = route.request();
          const path = new URL(request.url()).pathname;
          if (path.endsWith("/bulk") && request.method() === "POST") bulkWrites++;
          if (path === "/__fixture-api/admin/products" && request.method() === "GET" && failNextRead) {
            failNextRead = false;
            await route.fulfill({
              status: 500, contentType: "application/json",
              body: JSON.stringify({ message: "The post-write list read is unavailable." })
            });
          } else await route.continue();
        });

        await firstRow.locator('input[type="checkbox"]').check();
        await waitForPageText(page, "1 product selected");
        await page.locator("#bulk-action-trigger").click();
        await page.locator("#bulk-confirm-dialog").waitFor({ state: "visible" });
        await page.locator('#bulk-confirm-dialog button:has-text("Confirm action")').click();
        await waitForPageText(page, "1 product archived.");
        await waitForPageText(page, "The post-write list read is unavailable.");
        await page.waitForFunction(() => document.activeElement?.id === "admin-feedback");
        if (await firstRow.locator(".status-badge").innerText() !== previousStatus) {
          throw new Error("A failed refresh replaced the last confirmed list.");
        }
        await page.locator('button:has-text("Retry list read")').click();
        await page.locator("#admin-feedback").waitFor({ state: "hidden" });
        await page.waitForFunction(() => (
          document.querySelector(".admin-table tbody tr .status-badge")?.textContent
            ?.trim().toLowerCase() === "archived"
        ));
        if (bulkWrites !== 1) throw new Error("Retrying a list read repeated the accepted write.");
        await page.unroute(listPattern);

        const updatedRow = page.locator(".admin-table tbody tr").first();
        if ((await updatedRow.locator(".status-badge").innerText()).trim().toLowerCase() !== "archived") {
          throw new Error("Bulk status was not expressed as readable text.");
        }
      },
      {
        expectedConsoleErrors: [
          "[VeloDom] API Request Failed",
          "500 (Internal Server Error)",
          "409 (Conflict)"
        ]
      }
    );
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

async function assertNativeFormRecipes(page, origin) {
  await page.goto(`${origin}/forms`);
  await waitForPageText(page, "A bigger form, without a form DSL.");
  // The static SEO fallback can show the heading before the page binds events.
  await waitForFormStep(page, 1);
  const name = page.locator("#lesson-name");
  await name.fill("admin");
  await waitForPageText(page, "This demo name is reserved.");
  await name.fill("Reader");
  await page.locator("#lesson-name-error").waitFor({ state: "hidden" });
  await page.locator('button:has-text("Continue to contacts")').click();
  await waitForFormStep(page, 2);
  await page.locator('input[type="email"]').first().fill("reader@example.test");
  await page.locator('button:has-text("Add another email")').click();
  await page.locator('input[type="email"]').nth(1).fill("second@example.test");
  await page.locator('button:has-text("Review draft")').click();
  await waitForFormStep(page, 3);
  await waitForPageText(page, "second@example.test");
  await page.locator('button:has-text("Start again")').click();
  await waitForFormStep(page, 1);
}

async function waitForFormStep(page, step) {
  // CSS uppercases the rendered label; textContent retains the source value.
  await page.waitForFunction(expected => (
    document.querySelector('p[aria-live="polite"]')?.textContent?.includes(expected)
  ), `Step ${step} of 3`);
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

async function createStaticServer(root, requestHandler = null) {
  const server = createServer(async (request, response) => {
    try {
      if (requestHandler && await requestHandler(request, response)) return;

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
