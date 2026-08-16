import assert from "node:assert/strict";
import test from "node:test";
import {
  compileTemplate,
  defineTemplateOptimizer
} from "../../../packages/velodom/src/compiler/index.ts";
import {
  createTemplateModule
} from "../../../packages/velodom/src/vite-plugin/index.ts";

test("preferred directives compile to backward-compatible runtime names", () => {
  const result = compileTemplate(`
    <button
      vd-if="ready"
      vd-bind:disabled="saving"
      vd-on:click.prevent="save()"
    >
      Save
    </button>
  `, {
    filename: "button.html"
  });

  assert.match(result.html, /data-vd-if="ready"/);
  assert.match(result.html, /data-vd-disabled="saving"/);
  assert.match(result.html, /data-vd-onclick\.prevent="save\(\)"/);
  assert.equal(result.metadata.length, 3);
  assert.deepEqual(result.diagnostics, []);
});

test("legacy data-vd directives remain unchanged", () => {
  const source = '<h1 data-vd-text="title"></h1>';
  const result = compileTemplate(source);

  assert.equal(result.html, source);
  assert.equal(result.metadata[0].type, "legacy");
});

test("unknown directives produce source-aware diagnostics", () => {
  const result = compileTemplate('<div vd-unknown="value"></div>', {
    filename: "broken.html"
  });

  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].filename, "broken.html");
  assert.equal(result.diagnostics[0].location.line, 1);
  assert.equal(result.diagnostics[0].code, "VD_COMPILER_UNKNOWN_DIRECTIVE");
});

test("script contents are not parsed as template tags", () => {
  const source = '<script>const value = left < right;</script><p vd-text="value"></p>';
  const result = compileTemplate(source);

  assert.match(result.html, /left < right/);
  assert.match(result.html, /data-vd-text="value"/);
  assert.equal(result.metadata.length, 1);
});

test("text interpolations compile to text directives", () => {
  const result = compileTemplate(`
    <p>Hello {{ name }}. Age: {{ user.age }}</p>
  `);

  assert.match(
    result.html,
    /Hello <span data-vd-text="name"><\/span>\. Age: <span data-vd-text="user\.age"><\/span>/
  );
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.manifest.features, [
    "text"
  ]);
  assert.deepEqual(result.manifest.directives, [
    "data-vd-text"
  ]);
  assert.equal(result.metadata[0].type, "interpolation");
});

test("text interpolations escape directive expressions in attributes", () => {
  const result = compileTemplate("<p>{{ user['full name'] }}</p>");

  assert.match(
    result.html,
    /data-vd-text="user\['full name'\]"/
  );
  assert.deepEqual(result.diagnostics, []);
});

test("escaped text interpolations remain literal text", () => {
  const result = compileTemplate("<p>Use \\{{ name }} literally and {{ name }}</p>");

  assert.equal(
    result.html,
    '<p>Use {{ name }} literally and <span data-vd-text="name"></span></p>'
  );
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.metadata.length, 1);
});

test("text interpolations validate expressions with source diagnostics", () => {
  const result = compileTemplate("<p>Hello {{ user && }}</p>", {
    filename: "interpolation.html"
  });
  const diagnostic = result.diagnostics[0];

  assert.equal(diagnostic.code, "VD_EXPRESSION_SYNTAX");
  assert.equal(diagnostic.filename, "interpolation.html");
  assert.equal(diagnostic.location.line, 1);
  assert.ok(diagnostic.location.column > 1);
});

test("script and style contents do not compile text interpolations", () => {
  const source = [
    "<script>const template = '{{ name }}';</script>",
    "<style>.badge::after { content: '{{ label }}'; }</style>",
    "<p>{{ name }}</p>"
  ].join("");
  const result = compileTemplate(source);

  assert.match(result.html, /const template = '{{ name }}'/);
  assert.match(result.html, /content: '{{ label }}'/);
  assert.equal(result.metadata.length, 1);
  assert.match(result.html, /<span data-vd-text="name"><\/span>/);
});

test("vd-pre preserves literal interpolation examples inside an element", () => {
  const result = compileTemplate([
    "<pre vd-pre><code>{{ name }}</code></pre>",
    "<p>{{ name }}</p>"
  ].join(""));

  assert.match(
    result.html,
    /<pre data-vd-pre><code>{{ name }}<\/code><\/pre>/
  );
  assert.match(result.html, /<p><span data-vd-text="name"><\/span><\/p>/);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(
    result.metadata.filter(entry => entry.type === "interpolation").length,
    1
  );
  assert.deepEqual(result.manifest.features, [
    "text"
  ]);
  assert.deepEqual(result.manifest.directives, [
    "data-vd-pre",
    "data-vd-text"
  ]);
});

test("legacy data-vd-pre also preserves literal text content", () => {
  const result = compileTemplate([
    "<code data-vd-pre>{{ name }}</code>",
    "<p>{{ age }}</p>"
  ].join(""));

  assert.match(result.html, /<code data-vd-pre>{{ name }}<\/code>/);
  assert.match(result.html, /<p><span data-vd-text="age"><\/span><\/p>/);
  assert.equal(
    result.metadata.filter(entry => entry.type === "interpolation").length,
    1
  );
});

test("quoted greater-than characters do not close a start tag", () => {
  const result = compileTemplate('<p title="a > b" vd-show="visible"></p>');

  assert.match(result.html, /title="a > b"/);
  assert.match(result.html, /data-vd-show="visible"/);
});

test("invalid expressions fail with source-aware compiler diagnostics", () => {
  const result = compileTemplate(
    '<section vd-if="user &&"></section>',
    {
      filename: "broken-expression.html"
    }
  );
  const diagnostic = result.diagnostics[0];

  assert.equal(diagnostic.code, "VD_EXPRESSION_SYNTAX");
  assert.equal(diagnostic.filename, "broken-expression.html");
  assert.equal(diagnostic.location.line, 1);
  assert.ok(diagnostic.location.column > 1);
});

test("compiler validates object, optional-chain, and event expressions", () => {
  const result = compileTemplate(`
    <button
      vd-if="Boolean(post?.id)"
      vd-class="{ active: post.id === selectedId }"
      vd-on:click="select(post.id)"
    ></button>
  `);

  assert.deepEqual(result.diagnostics, []);
});

test("compiler rejects statically unsafe expression members", () => {
  const result = compileTemplate(
    '<span vd-text="user.constructor"></span>'
  );

  assert.equal(
    result.diagnostics[0].code,
    "VD_EXPRESSION_MEMBER_BLOCKED"
  );
});

test("compiler emits baseline accessibility warnings", () => {
  const result = compileTemplate(`
    <img src="/avatar.png">
    <input id="email" type="email">
    <a vd-nav>Missing href</a>
    <div vd-on:click="open()">Open</div>
    <h2>Section</h2>
    <h4>Skipped</h4>
  `, {
    filename: "accessibility.html"
  });
  const codes = result.diagnostics.map(diagnostic => diagnostic.code);

  assert.ok(codes.includes("VD_A11Y_IMG_ALT"));
  assert.ok(codes.includes("VD_A11Y_IMG_DIMENSIONS"));
  assert.ok(codes.includes("VD_A11Y_CONTROL_NAME"));
  assert.ok(codes.includes("VD_A11Y_ANCHOR_HREF"));
  assert.ok(codes.includes("VD_A11Y_NON_SEMANTIC_CLICK"));
  assert.ok(codes.includes("VD_A11Y_HEADING_ORDER"));
  assert.equal(
    result.diagnostics.every(diagnostic => diagnostic.severity === "warning"),
    true
  );
});

test("compiler accepts accessible static and bound template patterns", () => {
  const result = compileTemplate(`
    <label for="email">Email</label>
    <input id="email" type="email">
    <img vd-bind:alt="avatarAlt" src="/avatar.png" width="64" height="64">
    <a vd-bind:href="profileUrl" vd-nav>Profile</a>
    <div
      role="button"
      tabindex="0"
      vd-on:click="open()"
      vd-on:keydown.enter="open()"
    >Open</div>
  `);

  assert.deepEqual(
    result.diagnostics.filter(diagnostic => (
      diagnostic.code.startsWith("VD_A11Y_")
    )),
    []
  );
});

test("compiler leaves native progressive forms unchanged without runtime features", () => {
  const result = compileTemplate(`
    <form action="/contact" method="post">
      <input name="email" type="email" required>
      <button type="submit">Send</button>
    </form>
  `);

  assert.match(result.html, /action="\/contact"/);
  assert.match(result.html, /method="post"/);
  assert.deepEqual(result.manifest.features, []);
});

test("compiler creates a deterministic runtime feature manifest", () => {
  const result = compileTemplate(`
    <section vd-if="ready">
      <a
        vd-bind:href="url"
        vd-on:click.prevent="open()"
        vd-request="posts.load"
      >Open</a>
    </section>
  `);

  assert.deepEqual(result.manifest.features, [
    "bindings",
    "conditionals",
    "events",
    "requests"
  ]);
  assert.deepEqual(result.manifest.directives, [
    "data-vd-href",
    "data-vd-if",
    "data-vd-onclick.prevent",
    "data-vd-request"
  ]);
});

test("compiler normalizes route prefetch as a navigation feature", () => {
  const result = compileTemplate(`
    <a href="/about" vd-nav vd-prefetch>About</a>
  `);

  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.html.includes("data-vd-nav"), true);
  assert.equal(result.html.includes("data-vd-prefetch"), true);
  assert.deepEqual(result.manifest.features, [
    "navigation"
  ]);
  assert.deepEqual(result.manifest.directives, [
    "data-vd-nav",
    "data-vd-prefetch"
  ]);
});

test("compiler normalizes auto-state alias to request-state", () => {
  const result = compileTemplate(`
    <button
      vd-request="posts.load"
      vd-target="postResult"
      vd-auto-state
    >Load</button>
  `);

  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.html.includes("data-vd-request-state"), true);
  assert.equal(result.html.includes("data-vd-auto-state"), false);
  assert.deepEqual(result.manifest.features, [
    "requests"
  ]);
  assert.deepEqual(result.manifest.directives, [
    "data-vd-request",
    "data-vd-request-state",
    "data-vd-target"
  ]);
});

test("compiler normalizes request debounce directives", () => {
  const result = compileTemplate(`
    <button
      vd-request="posts.search"
      vd-debounce="searchDelay"
    >Search</button>
  `);

  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.html.includes("data-vd-debounce=\"searchDelay\""), true);
  assert.deepEqual(result.manifest.features, [
    "requests"
  ]);
  assert.deepEqual(result.manifest.directives, [
    "data-vd-debounce",
    "data-vd-request"
  ]);
});

test("compiler normalizes request throttle directives", () => {
  const result = compileTemplate(`
    <button
      vd-request="posts.save"
      vd-throttle="saveDelay"
    >Save</button>
  `);

  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.html.includes("data-vd-throttle=\"saveDelay\""), true);
  assert.deepEqual(result.manifest.features, [
    "requests"
  ]);
  assert.deepEqual(result.manifest.directives, [
    "data-vd-request",
    "data-vd-throttle"
  ]);
});

test("compiler normalizes rtl flip markers and records the manifest feature", () => {
  const result = compileTemplate(`
    <button>
      <svg vd-rtl-flip></svg>
    </button>
  `);

  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.html.includes("data-vd-rtl-flip"), true);
  assert.deepEqual(result.manifest.features, [
    "rtl-flip"
  ]);
  assert.deepEqual(result.manifest.directives, [
    "data-vd-rtl-flip"
  ]);
});

test("compiler accepts optional validation directive without runtime feature", () => {
  const result = compileTemplate(`
    <form vd-validate>
      <label for="title">Title</label>
      <input id="title" name="title" required>
    </form>
  `);

  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.html.includes("data-vd-validate"), true);
  assert.deepEqual(result.manifest.directives, [
    "data-vd-validate"
  ]);
  assert.deepEqual(result.manifest.features, []);
});

test("custom component and slot tags contribute runtime features", () => {
  const result = compileTemplate(`
    <vd-component name="card">
      <vd-child name="body">Body</vd-child>
    </vd-component>
  `);

  assert.deepEqual(result.manifest.features, [
    "components",
    "slots"
  ]);
});

test("custom optimizers transform output and extend the feature manifest", () => {
  const optimizer = defineTemplateOptimizer(
    "add-test-marker",
    (result, context) => {
      context.addRuntimeFeature("analytics");

      return {
        html: result.html.replace("<main", '<main data-optimized="true"')
      };
    }
  );
  const result = compileTemplate(
    '<main vd-text="title"></main>',
    {
      filename: "optimized.html",
      optimizers: [
        optimizer
      ]
    }
  );

  assert.match(result.html, /data-optimized="true"/);
  assert.deepEqual(result.manifest.features, [
    "analytics",
    "text"
  ]);
});

test("compiler rejects invalid optimizer output", () => {
  const optimizer = defineTemplateOptimizer(
    "invalid-output",
    () => ({
      unknown: true
    })
  );

  assert.throws(
    () => compileTemplate("<main></main>", {
      optimizers: [
        optimizer
      ]
    }),
    /unsupported key "unknown"/
  );
});

test("production template modules omit development metadata by default", () => {
  const production = createTemplateModule(
    '<p vd-text="title"></p>',
    {
      filename: "page.html",
      mode: "production"
    }
  );
  const development = createTemplateModule(
    '<p vd-text="title"></p>',
    {
      filename: "page.html",
      mode: "development"
    }
  );

  assert.doesNotMatch(production.code, /__vdMetadata/);
  assert.match(production.code, /__vdManifest/);
  assert.match(development.code, /__vdMetadata/);
  assert.match(development.code, /__vdManifest/);
});

test("Vite template modules can explicitly control compiler artifacts", () => {
  const module = createTemplateModule(
    '<p vd-text="title"></p>',
    {
      emitManifest: false,
      emitMetadata: true,
      mode: "production"
    }
  );

  assert.match(module.code, /__vdMetadata/);
  assert.doesNotMatch(module.code, /__vdManifest/);
});
