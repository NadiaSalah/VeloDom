/**
 * ----------------------------------------
 * Tests: Optional PWA Build Integration
 * ----------------------------------------
 *
 * Verifies manifest diagnostics, bounded cache strategies, generated worker
 * behavior, and the absence of registration assets until explicitly enabled.
 * ----------------------------------------
 */

import assert from "node:assert/strict";
import test from "node:test";
import { Script } from "node:vm";
import {
  createPwaRegistrationScript,
  createPwaServiceWorker,
  definePwaCacheStrategies,
  definePwaManifest,
  inspectPwaManifest,
  velodomPwa
} from "../../../packages/velodom/src/pwa.ts";

const manifest = {
  name: "VeloDom Notes",
  short_name: "VD Notes",
  start_url: "/",
  scope: "/",
  display: "standalone",
  theme_color: "#5445ee",
  icons: [
    { src: "/icons/app-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/app-512.png", sizes: "512x512", type: "image/png" }
  ]
};

test("PWA manifest helpers expose stable installability diagnostics", () => {
  assert.equal(definePwaManifest(manifest), manifest);
  assert.deepEqual(inspectPwaManifest(manifest), []);

  const diagnostics = inspectPwaManifest({
    start_url: "https://example.com",
    display: "browser",
    icons: []
  });

  assert.ok(diagnostics.some(item => item.code === "VD_PWA_NAME" && item.severity === "error"));
  assert.ok(diagnostics.some(item => item.code === "VD_PWA_START_URL"));
  assert.ok(diagnostics.some(item => item.code === "VD_PWA_ICONS"));
  assert.ok(diagnostics.some(item => item.path === "display" && item.severity === "warning"));
});

test("PWA service worker generation accepts only bounded declarative routes", () => {
  const strategies = definePwaCacheStrategies([
    {
      cacheName: "articles",
      match: "path-prefix",
      pathPrefix: "/articles/",
      strategy: "network-first"
    }
  ]);
  const worker = createPwaServiceWorker({
    offlineFallback: "/offline.html",
    precache: ["/assets/logo.svg"],
    strategies,
    version: "docs-v2"
  });

  assert.match(worker, /\/offline\.html/);
  assert.match(worker, /\/articles\//);
  assert.match(worker, /stale-while-revalidate|network-first/);
  assert.doesNotMatch(worker, /eval\(|new Function/);
  assert.doesNotThrow(() => new Script(worker));
  assert.throws(() => definePwaCacheStrategies([{
    cacheName: "bad",
    match: "path-prefix",
    strategy: "cache-first"
  }]), /pathPrefix/);

  const registration = createPwaRegistrationScript({
    serviceWorkerUrl: "/velodom-sw.js",
    scope: "/"
  });

  assert.match(registration, /serviceWorker\.register/);
  assert.match(registration, /velodom-sw\.js/);
  assert.doesNotThrow(() => new Script(registration));
  assert.match(createPwaRegistrationScript({
    serviceWorkerUrl: "./velodom-sw.js"
  }), /\.\/velodom-sw\.js/);
});

test("PWA Vite plugin emits runtime assets only with explicit serviceWorker options", () => {
  const manifestOnlyFiles = [];
  const manifestOnly = velodomPwa({ manifest });

  manifestOnly.generateBundle.call({
    emitFile: file => manifestOnlyFiles.push(file),
    error: message => { throw new Error(String(message)); }
  }, {}, {});
  assert.deepEqual(manifestOnlyFiles.map(file => file.fileName), [
    "manifest.webmanifest"
  ]);
  assert.equal(manifestOnly.transformIndexHtml().some(tag => tag.tag === "script"), false);

  const emitted = [];
  const warnings = [];
  const plugin = velodomPwa({
    manifest,
    serviceWorker: {
      offlineHtml: "<!doctype html><title>Offline</title><main>Offline</main>",
      precache: ["/"],
      register: true
    }
  });

  plugin.configResolved({ base: "/" });
  plugin.buildStart.call({
    error: message => { throw new Error(String(message)); },
    warn: message => warnings.push(String(message))
  });
  plugin.generateBundle.call({
    emitFile: file => emitted.push(file),
    error: message => { throw new Error(String(message)); }
  }, {}, {});

  assert.deepEqual(emitted.map(file => file.fileName).sort(), [
    "manifest.webmanifest",
    "offline.html",
    "velodom-pwa-register.js",
    "velodom-sw.js"
  ]);
  assert.equal(warnings.length, 0);
  assert.ok(plugin.transformIndexHtml().some(tag => (
    tag.tag === "script" && tag.attrs.src === "/velodom-pwa-register.js"
  )));

  const relativeBasePlugin = velodomPwa({
    manifest,
    serviceWorker: { register: true }
  });
  const relativeFiles = [];
  relativeBasePlugin.configResolved({ base: "./" });
  relativeBasePlugin.generateBundle.call({
    emitFile: file => relativeFiles.push(file),
    error: message => { throw new Error(String(message)); }
  }, {}, {});
  const relativeRegistration = relativeFiles.find(file => (
    file.fileName === "velodom-pwa-register.js"
  ));

  assert.match(String(relativeRegistration?.source), /\.\/velodom-sw\.js/);
  assert.match(String(relativeRegistration?.source), /scope: "\/"/);
});
