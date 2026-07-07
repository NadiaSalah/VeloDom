import assert from "node:assert/strict";
import test from "node:test";
import { applyDirectives } from "../../src/core/directives.ts";
import { createPageEventHub } from "../../src/core/events.ts";
import { mount } from "../../src/core/mount.ts";
import { createPageRouter } from "../../src/core/page-router.ts";
import { createState } from "../../src/core/reactive.ts";
import {
  configureRequestRuntime
} from "../../src/core/requests/request-router.ts";
import {
  installDom,
  waitFor
} from "../../test-support/dom.js";

const removeDom = installDom();

test.after(() => {
  removeDom();
});

test.beforeEach(() => {
  document.body.innerHTML = "";
  history.replaceState({}, "", "/");
  configureRequestRuntime();
});

test("directives react through a real DOM tree", async () => {
  const root = document.createElement("main");
  root.innerHTML = `
    <p id="if" data-vd-if="mode === 'ready'" data-vd-text="message"></p>
    <p id="elseif" data-vd-elseif="mode === 'waiting'">Waiting</p>
    <p id="else" data-vd-else>Fallback</p>
    <div id="show" data-vd-show="visible">Shown</div>
    <input
      id="bound"
      data-vd-value="inputValue"
      data-vd-disabled="disabled"
    >
    <input id="checked" type="checkbox" data-vd-checked="checked">
    <a
      id="link"
      data-vd-href="href"
      data-vd-class="{ active: enabled, muted: !enabled }"
      data-vd-style="{ color: color, fontSize: size }"
      data-vd-attr="{ title: title, 'data-kind': kind }"
    >Link</a>
    <img id="image" data-vd-src="src" data-vd-alt="alt">
  `;
  document.body.append(root);
  const state = createState({
    alt: "Cover",
    checked: true,
    color: "red",
    disabled: true,
    enabled: true,
    href: "/posts/1",
    inputValue: "draft",
    kind: "featured",
    message: "Ready",
    mode: "ready",
    size: "12px",
    src: "/cover.jpg",
    title: "Post",
    visible: false
  });
  const cleanup = await applyDirectives(root, state);

  assert.equal(root.querySelector("#if").textContent, "Ready");
  assert.equal(root.querySelector("#if").style.display, "");
  assert.equal(root.querySelector("#elseif").style.display, "none");
  assert.equal(root.querySelector("#else").style.display, "none");
  assert.equal(root.querySelector("#show").style.visibility, "hidden");
  assert.equal(root.querySelector("#bound").value, "draft");
  assert.equal(root.querySelector("#bound").disabled, true);
  assert.equal(root.querySelector("#checked").checked, true);
  assert.equal(root.querySelector("#link").getAttribute("href"), "/posts/1");
  assert.equal(root.querySelector("#link").classList.contains("active"), true);
  assert.equal(root.querySelector("#link").style.color, "red");
  assert.equal(root.querySelector("#link").style.fontSize, "12px");
  assert.equal(root.querySelector("#link").getAttribute("title"), "Post");
  assert.equal(root.querySelector("#link").dataset.kind, "featured");
  assert.equal(root.querySelector("#image").getAttribute("src"), "/cover.jpg");
  assert.equal(root.querySelector("#image").getAttribute("alt"), "Cover");

  state.mode = "waiting";
  state.visible = true;
  state.enabled = false;
  state.color = "blue";
  state.disabled = false;
  state.checked = false;
  state.href = null;

  assert.equal(root.querySelector("#if").style.display, "none");
  assert.equal(root.querySelector("#elseif").style.display, "");
  assert.equal(root.querySelector("#else").style.display, "none");
  assert.equal(root.querySelector("#show").style.visibility, "");
  assert.equal(root.querySelector("#link").classList.contains("active"), false);
  assert.equal(root.querySelector("#link").classList.contains("muted"), true);
  assert.equal(root.querySelector("#link").style.color, "blue");
  assert.equal(root.querySelector("#bound").disabled, false);
  assert.equal(root.querySelector("#checked").checked, false);
  assert.equal(root.querySelector("#link").hasAttribute("href"), false);

  state.mode = "unknown";

  assert.equal(root.querySelector("#elseif").style.display, "none");
  assert.equal(root.querySelector("#else").style.display, "");

  cleanup();
});

test("model and event modifiers synchronize state and remove listeners", async () => {
  const root = document.createElement("div");
  root.innerHTML = `
    <input id="name" data-vd-model="name">
    <input id="enabled" type="checkbox" data-vd-model="enabled">
    <button id="once" data-vd-on-click.prevent.once="increment()">Once</button>
    <input id="key" data-vd-on-keydown.enter="submit()">
  `;
  document.body.append(root);
  const state = createState({
    count: 0,
    enabled: false,
    name: "Nadia",
    submitted: 0
  });
  state.increment = () => {
    state.count += 1;
  };
  state.submit = () => {
    state.submitted += 1;
  };
  const cleanup = await applyDirectives(root, state);
  const name = root.querySelector("#name");
  const enabled = root.querySelector("#enabled");
  const once = root.querySelector("#once");
  const key = root.querySelector("#key");

  assert.equal(name.value, "Nadia");
  name.value = "VeloDom";
  name.dispatchEvent(new Event("input", {
    bubbles: true
  }));
  assert.equal(state.name, "VeloDom");

  enabled.checked = true;
  enabled.dispatchEvent(new Event("input", {
    bubbles: true
  }));
  assert.equal(state.enabled, true);

  const firstClick = new MouseEvent("click", {
    bubbles: true,
    cancelable: true
  });
  once.dispatchEvent(firstClick);
  once.dispatchEvent(new MouseEvent("click", {
    bubbles: true,
    cancelable: true
  }));
  assert.equal(firstClick.defaultPrevented, true);
  assert.equal(state.count, 1);

  key.dispatchEvent(new KeyboardEvent("keydown", {
    bubbles: true,
    key: "Escape"
  }));
  key.dispatchEvent(new KeyboardEvent("keydown", {
    bubbles: true,
    key: "Enter"
  }));
  assert.equal(state.submitted, 1);

  cleanup();
  key.dispatchEvent(new KeyboardEvent("keydown", {
    bubbles: true,
    key: "Enter"
  }));
  assert.equal(state.submitted, 1);
});

test("runtime manifests activate only selected directive features", async () => {
  const root = document.createElement("div");
  root.innerHTML = `
    <p data-vd-text="message"></p>
    <a data-vd-href="url">Link</a>
    <button data-vd-on-click="increment()">Increment</button>
  `;
  document.body.append(root);
  const state = createState({
    count: 0,
    message: "Manifest text",
    url: "/hidden-binding"
  });
  state.increment = () => {
    state.count += 1;
  };
  const cleanup = await applyDirectives(root, state, {
    features: [
      "text"
    ]
  });

  assert.equal(root.querySelector("p").textContent, "Manifest text");
  assert.equal(root.querySelector("a").hasAttribute("href"), false);
  root.querySelector("button").click();
  assert.equal(state.count, 0);

  cleanup();
});

test("loops render scoped state and clean detached event handlers", async () => {
  const root = document.createElement("ul");
  root.innerHTML = `
    <li data-vd-for="(item, index) in items">
      <button
        data-vd-text="index + ': ' + item.name"
        data-vd-on-click="select(item.id)"
      ></button>
    </li>
  `;
  document.body.append(root);
  const state = createState({
    items: [
      {
        id: 1,
        name: "First"
      },
      {
        id: 2,
        name: "Second"
      }
    ],
    selected: 0
  });
  state.select = id => {
    state.selected = id;
  };
  const cleanup = await applyDirectives(root, state);
  const oldButton = root.querySelector("button");

  assert.deepEqual(
    [...root.querySelectorAll("button")].map(node => node.textContent),
    ["0: First", "1: Second"]
  );

  oldButton.click();
  assert.equal(state.selected, 1);

  state.items = [
    {
      id: 3,
      name: "Third"
    }
  ];
  state.selected = 0;

  assert.deepEqual(
    [...root.querySelectorAll("button")].map(node => node.textContent),
    ["0: Third"]
  );
  oldButton.click();
  assert.equal(state.selected, 0);

  cleanup();
});

test("components integrate props, slots, refs, expose, and cleanup", async () => {
  const root = document.createElement("div");
  root.innerHTML = `
    <section
      data-vd-component="profile-card"
      data-vd-ref="cards"
      data-vd-key="primary"
      data-vd-props="{ name: userName }"
    >
      <p data-vd-child="body">Slotted biography</p>
    </section>
  `;
  document.body.append(root);
  const order = [];
  const parentState = createState({
    components: {},
    greeting: "Parent greeting",
    theme: "light",
    userName: "Nadia"
  });
  let titleRef = null;
  const resources = {
    html: {
      "profile-card": async () => `
        <article>
          <h2 data-vd-ref="title" data-vd-text="greeting"></h2>
          <small data-vd-text="theme"></small>
          <div data-vd-get-child="body"></div>
          <button data-vd-on-click="rename()">Rename</button>
        </article>
      `
    },
    modules: {
      "profile-card": async () => ({
        init({
          props,
          refs,
          ctx
        }) {
          order.push("init");
          titleRef = refs.title;
          ctx.onCleanup(() => {
            order.push("cleanup");
          });

          return {
            state: {
              greeting: `Hello ${props.name}`
            },
            expose: {
              rename() {
                this.greeting = "Renamed";
              },
              readGreeting() {
                return this.greeting;
              }
            }
          };
        },
        mounted() {
          order.push("mounted");
        },
        destroy() {
          order.push("destroy");
        }
      })
    },
    manifests: {
      "profile-card": async () => ({
        directives: [
          "data-vd-onclick",
          "data-vd-text"
        ],
        features: [
          "events",
          "slots",
          "text"
        ]
      })
    },
    styles: {}
  };
  const cleanup = await mount(root, parentState, [], null, resources);
  const heading = root.querySelector("h2");

  assert.equal(titleRef, heading);
  assert.equal(heading.textContent, "Hello Nadia");
  assert.equal(root.querySelector("small").textContent, "light");
  assert.equal(root.querySelector("[data-vd-get-child]").textContent.trim(), "Slotted biography");
  assert.equal(parentState.components.cards.length, 1);
  assert.equal(
    parentState.components.cards.byKey.primary.readGreeting(),
    "Hello Nadia"
  );

  parentState.theme = "dark";
  parentState.greeting = "Changed parent greeting";
  assert.equal(root.querySelector("small").textContent, "dark");
  assert.equal(heading.textContent, "Hello Nadia");

  root.querySelector("button").click();
  assert.equal(heading.textContent, "Renamed");

  await cleanup();

  assert.equal(parentState.components.cards, undefined);
  assert.deepEqual(order, [
    "init",
    "mounted",
    "destroy",
    "cleanup"
  ]);
});

test("grouped component refs expose all instances and keyed instances", async () => {
  const root = document.createElement("div");
  root.innerHTML = `
    <div
      data-vd-component="badge"
      data-vd-ref="badges"
      data-vd-key="first"
      data-vd-prop-label="one"
    ></div>
    <div
      data-vd-component="badge"
      data-vd-ref="badges"
      data-vd-key="second"
      data-vd-prop-label="two"
    ></div>
  `;
  document.body.append(root);
  const state = createState({
    components: {}
  });
  const resources = {
    html: {
      badge: async () => "<span data-vd-text=\"label\"></span>"
    },
    modules: {
      badge: async () => ({
        init({
          props
        }) {
          return {
            state: {
              label: props.label
            },
            expose: {
              read() {
                return this.label;
              }
            }
          };
        }
      })
    },
    manifests: {
      badge: async () => ({
        directives: [
          "data-vd-text"
        ],
        features: [
          "text"
        ]
      })
    },
    styles: {}
  };
  const cleanup = await mount(root, state, [], null, resources);

  assert.equal(state.components.badges.length, 2);
  assert.deepEqual(
    [...state.components.badges.read()].sort(),
    ["one", "two"]
  );
  assert.equal(state.components.badges.byKey.first.read(), "one");
  assert.equal(state.components.badges.byKey.second.read(), "two");

  await cleanup();
  assert.equal(state.components.badges, undefined);
});

test("page router drives navigation, route context, persistence, and teardown", async () => {
  document.body.innerHTML = '<div id="app"></div>';
  const lifecycle = [];
  const adapter = {
    pages: {
      html: {
        "404": async () => "<h1>Missing</h1>",
        home: async () => `
          <button data-vd-on-click="increment()" data-vd-text="count"></button>
          <a href="/posts/42?tag=a&tag=b" data-vd-nav>Open post</a>
        `,
        "posts/[id]": async () => `
          <h1 data-vd-text="'Post ' + postId"></h1>
          <p data-vd-text="tags.join(',')"></p>
        `
      },
      modules: {
        home: async () => ({
          init({
            state,
            ctx
          }) {
            lifecycle.push("home:init");
            ctx.onCleanup(() => {
              lifecycle.push("home:cleanup");
            });

            return {
              state: {
                count: state.count ?? 1,
                increment() {
                  this.count += 1;
                }
              }
            };
          },
          destroy() {
            lifecycle.push("home:destroy");
          }
        }),
        "posts/[id]": async () => ({
          init({
            ctx
          }) {
            return {
              state: {
                postId: ctx.params.id,
                tags: ctx.query.tag
              }
            };
          }
        })
      },
      configs: {
        home: {},
        "posts/[id]": {
          meta: {
            section: "blog"
          }
        }
      },
      manifests: {
        home: async () => ({
          directives: [
            "data-vd-onclick",
            "data-vd-text",
            "data-vd-nav"
          ],
          features: [
            "events",
            "navigation",
            "text"
          ]
        }),
        "posts/[id]": async () => ({
          directives: [
            "data-vd-text"
          ],
          features: [
            "text"
          ]
        })
      },
      styles: {}
    },
    components: {
      html: {},
      modules: {},
      styles: {}
    }
  };
  const router = createPageRouter(adapter);

  await router.init();
  document.querySelector("button").click();
  assert.equal(document.querySelector("button").textContent, "2");

  document.querySelector("a").click();
  await waitFor(() => {
    assert.equal(document.querySelector("h1")?.textContent, "Post 42");
  });
  assert.equal(document.querySelector("p").textContent, "a,b");
  assert.deepEqual(lifecycle.slice(-2), [
    "home:destroy",
    "home:cleanup"
  ]);

  await router.navigate("/");
  assert.equal(document.querySelector("button").textContent, "2");

  await router.destroy();
});

test("page router scrolls to hash fragments after navigation", async () => {
  document.body.innerHTML = '<main id="app"></main>';
  const calls = [];
  const router = createPageRouter({
    pages: {
      html: {
        home: async () => `
          <h1>Home</h1>
          <section id="details">Details</section>
        `
      },
      styles: {}
    },
    components: {
      html: {},
      modules: {},
      styles: {}
    }
  });
  const originalScrollIntoView = Element.prototype.scrollIntoView;

  Element.prototype.scrollIntoView = function scrollIntoView() {
    calls.push(this.id);
  };

  try {
    await router.init();
    await router.navigate("/#details");

    assert.deepEqual(calls, [
      "details"
    ]);
  } finally {
    Element.prototype.scrollIntoView = originalScrollIntoView;
    await router.destroy();
  }
});

test("page router restores saved scroll positions on popstate", async () => {
  document.body.innerHTML = '<main id="app"></main>';
  const scrollCalls = [];
  const originalScrollTo = window.scrollTo;
  const router = createPageRouter({
    pages: {
      html: {
        home: async () => "<h1>Home</h1>",
        features: async () => "<h1>Features</h1>"
      },
      styles: {}
    },
    components: {
      html: {},
      modules: {},
      styles: {}
    }
  });

  window.scrollTo = (x, y) => {
    scrollCalls.push([x, y]);
  };

  Object.defineProperty(window, "scrollX", {
    configurable: true,
    value: 4
  });
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: 120
  });

  try {
    await router.init();
    await router.navigate("/features");
    history.pushState({}, "", "/");
    window.dispatchEvent(new Event("popstate"));

    await waitFor(() => {
      assert.deepEqual(scrollCalls.at(-1), [
        4,
        120
      ]);
    });
  } finally {
    window.scrollTo = originalScrollTo;
    await router.destroy();
  }
});

test("request directives update state, emit success, and abort on cleanup", async () => {
  const root = document.createElement("div");
  root.innerHTML = `
    <button
      data-vd-request="posts.load"
      data-vd-params="{ id: postId }"
      data-vd-target="result"
      data-vd-loading="loading"
      data-vd-error="error"
    >Load</button>
  `;
  document.body.append(root);
  let resolveRequest;
  let requestSignal;
  configureRequestRuntime({
    routes: {
      "posts.load": async (params, context) => {
        requestSignal = context.signal;

        return new Promise(resolve => {
          resolveRequest = () => resolve({
            id: params.id
          });
        });
      }
    }
  });
  const events = createPageEventHub();
  const successes = [];
  events.on("vd:request:success", event => {
    successes.push(event);
  });
  const state = createState({
    emit: events.emit,
    error: "",
    loading: false,
    postId: 7,
    result: null
  });
  const cleanup = await applyDirectives(root, state);

  root.querySelector("button").click();
  await waitFor(() => {
    assert.equal(state.loading, true);
    assert.ok(requestSignal);
  });

  resolveRequest();
  await waitFor(() => {
    assert.deepEqual(state.result, {
      id: 7
    });
  });
  assert.equal(state.loading, false);
  assert.equal(successes.length, 1);

  const firstSignal = requestSignal;
  state.result = null;
  root.querySelector("button").click();
  await waitFor(() => {
    assert.notEqual(requestSignal, firstSignal);
    assert.equal(requestSignal.aborted, false);
  });
  cleanup();

  assert.equal(requestSignal.aborted, true);
  resolveRequest();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(state.result, null);
});
