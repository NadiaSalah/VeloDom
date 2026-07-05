import assert from "node:assert/strict";
import test from "node:test";
import {
  indexFolderFiles,
  indexFolderVariants,
  mapLoaderExports,
  rebaseFiles
} from "../../src/core/adapters/resource-map.ts";

test("page files are indexed by nested folder name", () => {
  const homeLoader = () => "home";
  const postLoader = () => "post";
  const indexed = indexFolderFiles({
    "../pages/home/index.html": homeLoader,
    "../pages/posts/details/index.html": postLoader,
    "../components/card/index.html": () => "ignored"
  }, "../pages/", "/index.html");

  assert.equal(Object.getPrototypeOf(indexed), null);
  assert.equal(indexed.home, homeLoader);
  assert.equal(indexed["posts/details"], postLoader);
  assert.equal(Object.hasOwn(indexed, "card"), false);
});

test("preferred script files override backward-compatible module names", () => {
  const legacy = () => "legacy";
  const javascript = () => "javascript";
  const typescript = () => "typescript";
  const indexed = indexFolderVariants({
    "../pages/home/page.js": legacy,
    "../pages/home/script.js": javascript,
    "../pages/home/script.ts": typescript
  }, "../pages/", [
    "/script.ts",
    "/script.js",
    "/page.js"
  ]);

  assert.equal(indexed.home, typescript);
});

test("style files are rebased without leaking adapter paths", () => {
  const homeStyle = () => "home css";
  const rebased = rebaseFiles({
    "../pages/home/style.css": homeStyle,
    "../components/card/style.css": () => "ignored"
  }, "../pages/");

  assert.deepEqual(Object.keys(rebased), [
    "home/style.css"
  ]);
  assert.equal(rebased["home/style.css"], homeStyle);
});

test("module export loaders derive values and allow missing manifests", async () => {
  let loads = 0;
  const files = {
    "../pages/home/index.html": async () => {
      loads += 1;

      return {
        default: "<main></main>"
      };
    }
  };
  const html = mapLoaderExports(files, "default");
  const manifests = mapLoaderExports(files, "__vdManifest");

  assert.equal(
    await html["../pages/home/index.html"](),
    "<main></main>"
  );
  assert.equal(
    await manifests["../pages/home/index.html"](),
    undefined
  );
  assert.equal(loads, 2);
});
