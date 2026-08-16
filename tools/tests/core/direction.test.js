import assert from "node:assert/strict";
import test from "node:test";
import {
  createApp,
  createDirectionPlugin,
  createRtlFlipStyles
} from "../../../packages/velodom/src/index.ts";
import {
  installDom,
  waitFor
} from "../../test-support/dom.js";

const removeDom = installDom();

test.after(() => {
  removeDom();
});

test.beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main>';
  document.documentElement.setAttribute("lang", "en");
  document.documentElement.setAttribute("dir", "ltr");
});

test("direction plugin updates html lang and dir for configured locales", async () => {
  const app = createDirectionApp();

  await app.mount();
  assert.equal(document.documentElement.lang, "en");
  assert.equal(document.documentElement.dir, "ltr");
  assert.equal(app.direction.locale, "en");
  assert.equal(app.direction.isRTL, false);

  app.direction.setLocale("ar");
  assert.equal(document.documentElement.lang, "ar");
  assert.equal(document.documentElement.dir, "rtl");
  assert.equal(app.direction.locale, "ar");
  assert.equal(app.direction.isRTL, true);

  await app.destroy();
  assert.equal(document.documentElement.lang, "en");
  assert.equal(document.documentElement.dir, "ltr");
});

test("direction plugin exposes ctx.direction and reactive $direction", async () => {
  let contextDirection = null;
  const app = createApp({
    adapter: {
      pages: {
        html: {
          home: async () => `
            <p data-vd-text="$direction.direction"></p>
            <aside data-vd-class="{ 'is-rtl': $direction.isRTL }"></aside>
          `
        },
        modules: {
          home: async () => ({
            init({
              ctx
            }) {
              contextDirection = ctx.direction;
            }
          })
        },
        manifests: {
          home: async () => ({
            directives: [
              "data-vd-class",
              "data-vd-text"
            ],
            features: [
              "bindings",
              "text"
            ]
          })
        }
      }
    },
    plugins: [
      createDirectionPlugin({
        defaultLocale: "en",
        locales: {
          en: {
            lang: "en",
            direction: "ltr"
          },
          ar: {
            lang: "ar",
            direction: "rtl"
          }
        }
      })
    ]
  });

  await app.mount();
  assert.equal(contextDirection, app.direction);
  assert.equal(document.querySelector("p").textContent, "ltr");
  assert.equal(document.querySelector("aside").classList.contains("is-rtl"), false);

  app.direction.setLocale("ar");
  await waitFor(() => {
    assert.equal(document.querySelector("p").textContent, "rtl");
  });
  assert.equal(document.querySelector("aside").classList.contains("is-rtl"), true);

  await app.destroy();
});

test("direction plugin validates locales and directions", async () => {
  assert.throws(
    () => createDirectionPlugin({
      defaultLocale: "missing",
      locales: {
        en: {
          direction: "ltr"
        }
      }
    }),
    /Default VeloDom locale/
  );

  assert.throws(
    () => createDirectionPlugin({
      locales: {
        ar: {
          direction: "up"
        }
      }
    }),
    /Invalid VeloDom locale/
  );

  const app = createDirectionApp();

  await app.mount();
  assert.throws(
    () => app.direction.setLocale("missing"),
    /Unknown VeloDom locale/
  );
  assert.throws(
    () => app.direction.setDirection("sideways"),
    /Invalid VeloDom direction/
  );
  await app.destroy();
});

test("direction plugin rejects duplicate registration", async () => {
  const app = createApp({
    adapter: createEmptyAdapter(),
    plugins: [
      createDirectionPlugin(),
      createDirectionPlugin()
    ]
  });

  await assert.rejects(
    () => app.mount(),
    /direction plugin is already registered/
  );
});

test("RTL flip style helper generates project-owned CSS", () => {
  assert.equal(
    createRtlFlipStyles(),
    [
      "[data-vd-rtl-flip] {",
      "  --vd-icon-transform: scaleX(1);",
      "  transform: var(--vd-icon-transform);",
      "}",
      "",
      "html[dir=\"rtl\"] [data-vd-rtl-flip] {",
      "  --vd-icon-transform: scaleX(-1);",
      "}"
    ].join("\n")
  );
});

test("RTL flip style helper accepts project-owned selectors", () => {
  assert.equal(
    createRtlFlipStyles({
      rtlSelector: ".rtl",
      selector: ".flip",
      transformVariable: "--icon-dir",
      rtlTransform: "rotate(180deg)"
    }),
    [
      ".flip {",
      "  --icon-dir: scaleX(1);",
      "  transform: var(--icon-dir);",
      "}",
      "",
      ".rtl .flip {",
      "  --icon-dir: rotate(180deg);",
      "}"
    ].join("\n")
  );
});

function createDirectionApp() {
  return createApp({
    adapter: createEmptyAdapter(),
    plugins: [
      createDirectionPlugin({
        defaultLocale: "en",
        locales: {
          en: {
            lang: "en",
            direction: "ltr"
          },
          ar: {
            lang: "ar",
            direction: "rtl"
          }
        }
      })
    ]
  });
}

function createEmptyAdapter() {
  return {
    pages: {
      html: {
        home: async () => "<main></main>"
      },
      manifests: {
        home: async () => ({
          directives: [],
          features: []
        })
      }
    }
  };
}
