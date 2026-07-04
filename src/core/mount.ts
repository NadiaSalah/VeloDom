import {
  VD,
  VD_INTERNAL
} from "./constants.ts";
import { getRefs } from "./refs.ts";
import { applyDirectives } from "./directives.ts";
import {
  createChildState,
  createState,
  mergeExposedMembers,
  mergeState
} from "./reactive.ts";
import { applyScopedFolderStyles } from "./styles.ts";
import { reportUserActionError } from "./errors/error-reporter.ts";
import {
  runModuleHook,
  runModuleInit
} from "./init-runner.ts";
import { createLifecycleScope } from "./lifecycle.ts";
import { evaluateExpression } from "./expression/index.ts";
import { isPlainObject } from "./shared/object.ts";
import { normalizeFolderPath } from "./shared/path.ts";

const loaded = new WeakSet();

export async function mount(
  root: any = document,
  parentState: any = null,
  ancestry: string[] = [],
  pageCtx: any = null,
  resources: any = {}
) {

  normalizeTemplateSyntax(root);

  const components = findComponents(root);

  await Promise.all(

    [...components].map(async (el) => {

      if (loaded.has(el)) return;

      loaded.add(el);

      const name = getComponentName(el);
      const folder = resolveComponentFolder(el, name);
      const recursive = ancestry.includes(folder);

      if (!folder) return;
      if (recursive) {
        reportUserActionError(`Recursive component "${folder}" blocked`, {
          title: "Recursive Component Usage",
          file: "src/core/mount.ts",
          line: 49,
          el,
          hint: "Avoid rendering the same component inside itself without a stop condition."
        });

        el.innerHTML = `
          <div>
            Recursive component "${folder}" blocked
          </div>
        `;
        return;
      }

      let cleanup = null;
      let state = null;
      let unregisterInstance = null;
      let componentModule = null;
      let lifecycle = null;
      let hookArgs = null;

      try {

        const loadHtml = resources.html?.[folder];

        if (!loadHtml) {
          throw new Error(`Component "${folder}" not found`);
        }

        const slots = collectSlots(el);
        const html = await loadHtml();

        el.innerHTML = html;
        applySlots(el, slots);
        await applyScopedFolderStyles(
          el,
          resources.styles || {},
          `${folder}/`
        );

        const refs = getRefs(el);

        const props = getProps(el, parentState);

        state = parentState
          ? createChildState(parentState, props)
          : createState(props);
        const loadModule = resources.modules?.[folder];
        lifecycle = createLifecycleScope(
          createComponentContext(el, pageCtx, state)
        );
        hookArgs = {
          el,
          props,
          refs,
          state,
          ctx: lifecycle.context
        };

        let moduleResult = null;

        if (loadModule) {

          componentModule = await loadModule();
          moduleResult = await runModuleInit(
            componentModule.init || componentModule.default,
            hookArgs
          );

          mergeState(state, moduleResult);
          mergeExposedMembers(state, moduleResult?.expose);
        }

        unregisterInstance = registerComponentInstance(
          el,
          parentState,
          state,
          moduleResult?.expose
        );

        const directivesCleanup = applyDirectives(el, state, {
          el,
          props,
          page: pageCtx?.page || "",
          getPageState: pageCtx?.getPageState || null,
          hasPage: pageCtx?.hasPage || null
        });

        const childrenCleanup = await mount(
          el,
          state,
          [...ancestry, folder],
          pageCtx,
          resources
        );

        cleanup = once(async () => {
          await childrenCleanup?.();
          unregisterInstance?.();
          directivesCleanup?.();
          await runModuleHook(componentModule?.destroy, hookArgs);
          await lifecycle?.dispose();
          state?._dispose?.();
        });

        el[VD_INTERNAL.CLEANUP_KEY] = cleanup;

        await runModuleHook(componentModule?.mounted, hookArgs);

        if (shouldUnwrapComponent(el)) {
          unwrapComponent(el);
        }

      } catch (err) {
        await cleanup?.();
        unregisterInstance?.();
        await lifecycle?.dispose();
        state?._dispose?.();
        reportUserActionError(err, {
          title: `Component Crash: ${name || "Unknown"}`,
          file: "src/core/mount.ts",
          line: 62,
          hint: "Verify the component folder, script.js/script.ts exports, and template expressions.",
          fatal: true
        });
      }

    })

  );

  return () => {
    return disposeTree(root);
  };
}

function getProps(el, parentState) {

  const props = parsePropsObject(
    el.getAttribute(VD.PROPS),
    parentState
  );

  [...el.attributes].forEach(attr => {

    if (attr.name.startsWith(VD.PROP)) {
      const key = attr.name.replace(VD.PROP, "");

      props[key] = attr.value;
      return;
    }

    if (!attr.name.startsWith("data-vd-")) return;

    if (attr.name.startsWith(VD.ON)) return;
    if (attr.name.startsWith(VD.PROP)) return;
    if (attr.name === VD.PROPS) return;

    const ignore = [
      VD.REF,
      VD.IF,
      VD.SHOW,
      VD.ELSEIF,
      VD.ELSE,
      VD.FOR,
      VD.MODEL,
      VD.TEXT,
      VD.SRC,
      VD.HREF,
      VD.STYLE,
      VD.CLASS,
      VD.ALT,
      VD.DISABLED,
      VD.CHECKED,
      VD.VALUE,
      VD.ATTR,
      VD.PATH,
      VD.CHILD,
      VD.GET_CHILD,
      VD.PROPS,
      VD.COMPONENT,
      VD.KEY,
      VD.REQUEST,
      VD.REQUEST_CONFIG,
      VD.REQUEST_STATE,
      VD.PARAMS,
      VD.TARGET,
      VD.STATE,
      VD.LOADING,
      VD.ERROR
    ];

    if (ignore.includes(attr.name)) return;

    const key = attr.name.replace("data-vd-", "");

    props[key] = attr.value;

  });

  return props;
}

function parsePropsObject(expression, state) {
  if (!expression) return {};

  try {
    const result = evaluateExpression(expression, {
      state: state || {}
    });

    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return {};
    }

    return result;
  } catch (err) {
    reportUserActionError(err, {
      title: "Invalid Component Props Expression",
      directive: VD.PROPS,
      expression,
      file: "src/core/mount.ts",
      line: 200,
      hint: "Use a valid object expression. Example: { name: userName, age: 20 }"
    });

    return {};
  }
}

function findComponents(root) {
  return root.querySelectorAll(
    VD.selector(VD.COMPONENT)
  );
}

function getComponentName(el) {
  return (
    el.getAttribute(VD.COMPONENT)
    || el.getAttribute("name")
    || el.id
  );
}

function resolveComponentFolder(el, name) {
  const componentName = (name || "").trim();

  if (!componentName) return "";

  const base = normalizeFolderPath(
    el.getAttribute(VD.PATH)
  );

  return base
    ? `${base}/${componentName}`
    : componentName;
}

function collectSlots(el) {
  normalizeSlotSyntax(el);

  const slots = new Map();
  const slotNodes = [...el.children]
    .filter(node => node.hasAttribute(VD.CHILD));

  slotNodes.forEach(node => {
    const name = normalizeSlotName(
      node.getAttribute(VD.CHILD)
    );
    const queue = slots.get(name) || [];

    queue.push(extractSlotFragment(node));
    slots.set(name, queue);
  });

  return slots;
}

function applySlots(el, slots) {
  const outlets = findSlotOutlets(el);

  outlets.forEach(outlet => {
    const name = normalizeSlotName(
      outlet.getAttribute(VD.GET_CHILD)
    );
    const queue = slots.get(name);

    if (!queue?.length) return;

    const fragment = queue.shift();

    outlet.replaceChildren(fragment);
  });
}

function findSlotOutlets(root) {
  const selector = VD.selector(VD.GET_CHILD);
  const outlets = [];

  if (root.matches?.(selector)) {
    outlets.push(root);
  }

  outlets.push(...root.querySelectorAll(selector));

  return outlets;
}

function normalizeSlotName(name) {
  return (name || "").trim();
}

function extractSlotFragment(node) {
  const fragment = document.createDocumentFragment();

  if (node.tagName === "TEMPLATE") {
    fragment.append(node.content.cloneNode(true));
    return fragment;
  }

  if (isCustomSlotTag(node)) {
    [...node.childNodes].forEach(child => {
      fragment.append(child.cloneNode(true));
    });
    return fragment;
  }

  const clone = node.cloneNode(true);
  clone.removeAttribute(VD.CHILD);
  fragment.append(clone);

  return fragment;
}

function normalizeTemplateSyntax(root) {
  normalizeComponentTags(root);
  normalizeSlotSyntax(root);
}

function normalizeComponentTags(root) {
  const candidates = [
    ...root.querySelectorAll(VD.COMPONENT_TAG_SELECTOR)
  ];

  candidates.forEach(node => {
    if (node.hasAttribute(VD.COMPONENT)) return;

    const name = (node.getAttribute("name") || "").trim();

    if (!name) return;

    node.setAttribute(VD.COMPONENT, name);
    node.setAttribute(VD.HOSTLESS, "true");
    node.removeAttribute("name");

    const customPath = node.getAttribute("path");

    if (customPath !== null) {
      node.setAttribute(VD.PATH, customPath);
      node.removeAttribute("path");
    }
  });
}

function normalizeSlotSyntax(root) {
  const candidates = [
    ...root.querySelectorAll(VD.SLOT_TAG_SELECTOR)
  ];

  candidates.forEach(node => {
    if (node.hasAttribute(VD.CHILD)) return;

    const name = node.getAttribute("name") || "";

    node.setAttribute(VD.CHILD, name);
    node.removeAttribute("name");
  });
}

function shouldUnwrapComponent(el) {
  return el.getAttribute(VD.HOSTLESS) === "true";
}

function unwrapComponent(el) {
  const scopeId = el.getAttribute(VD.SCOPE);
  const fragment = document.createDocumentFragment();
  const cleanup = el[VD_INTERNAL.CLEANUP_KEY];
  const runCleanup = once(() => cleanup?.());

  if (scopeId) {
    [...el.children].forEach(child => {
      if (child.tagName === "STYLE") return;

      child.setAttribute(VD.SCOPE, scopeId);
      child[VD_INTERNAL.CLEANUP_KEY] = runCleanup;
    });
  }

  if (!scopeId) {
    [...el.children].forEach(child => {
      child[VD_INTERNAL.CLEANUP_KEY] = runCleanup;
    });
  }

  while (el.firstChild) {
    fragment.append(el.firstChild);
  }

  el.replaceWith(fragment);
}

function isCustomSlotTag(node) {
  return ["VD-CHILD", "CHILD", "CHILED"]
    .includes(node.tagName);
}

export async function disposeTree(root: any) {
  const callbacks = new Set<() => unknown | Promise<unknown>>();

  if (typeof root?.[VD_INTERNAL.CLEANUP_KEY] === "function") {
    callbacks.add(root[VD_INTERNAL.CLEANUP_KEY]);
  }

  root?.querySelectorAll?.("*")
    .forEach(node => {
      if (typeof node[VD_INTERNAL.CLEANUP_KEY] === "function") {
        callbacks.add(node[VD_INTERNAL.CLEANUP_KEY]);
      }
    });

  for (const callback of callbacks) {
    await callback();
  }
}

function once(fn: (...args: any[]) => any) {
  let called = false;

  return () => {
    if (called) return;

    called = true;
    return fn();
  };
}

function registerComponentInstance(el, parentState, state, expose) {
  const refName = (el.getAttribute(VD.REF) || "").trim();

  if (!refName) return null;

  const registry = ensureComponentRegistry(parentState);

  if (!registry) return null;

  const api = createPublicInstanceApi(state, expose);
  const key = getComponentKey(el);
  const group = ensureComponentGroup(registry, refName);

  const unregister = group.__register(api, key);

  return () => {
    unregister();

    if (group.__size() === 0) {
      delete registry[refName];
    }
  };
}

function ensureComponentRegistry(state) {
  if (!state || typeof state !== "object") return null;

  if (!state.components || typeof state.components !== "object") {
    state.components = {};
  }

  return state.components;
}

function createPublicInstanceApi(state, expose) {
  const api = {
    state
  };
  const members = isPlainObject(expose)
    ? expose
    : collectStateFunctions(state);

  Object.entries(members).forEach(([name, value]) => {
    if (typeof value === "function") {
      api[name] = (...args) => value.apply(state, args);
      return;
    }

    api[name] = value;
  });

  return api;
}

function ensureComponentGroup(registry, refName) {
  const existing = registry[refName];

  if (existing?.__isComponentGroup) {
    return existing;
  }

  const groupState = {
    all: [],
    byKey: {}
  };

  const groupApi = new Proxy(groupState, {
    get(target, prop, receiver) {
      if (prop === "__isComponentGroup") return true;
      if (prop === "__register") return register;
      if (prop === "__size") return () => target.all.length;
      if (prop === "state") return target.all[0]?.state;
      if (prop === "length") return target.all.length;
      if (prop === "first") return target.all[0];

      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }

      return (...args) => {
        const results = [];

        target.all.forEach(instance => {
          const method = instance?.[prop];

          if (typeof method === "function") {
            results.push(method(...args));
          }
        });

        if (results.length === 0) return undefined;
        if (results.length === 1) return results[0];

        return results;
      };
    }
  });

  registry[refName] = groupApi;

  return groupApi;
}

function register(instance, key) {
  this.all.push(instance);

  if (key) {
    this.byKey[key] = instance;
  }

  return () => {
    const index = this.all.indexOf(instance);

    if (index !== -1) {
      this.all.splice(index, 1);
    }

    if (key && this.byKey[key] === instance) {
      delete this.byKey[key];
    }
  };
}

function collectStateFunctions(state) {
  return Object.keys(state)
    .filter(key => typeof state[key] === "function")
    .reduce((acc, key) => {
      acc[key] = state[key];
      return acc;
    }, {});
}

function getComponentKey(el) {
  const raw = el.getAttribute(VD.KEY);

  if (raw === null || raw === undefined) return "";

  return String(raw).trim();
}

function createComponentContext(el, pageCtx, state) {
  const ref = (el.getAttribute(VD.REF) || "").trim();
  const key = getComponentKey(el);

  return {
    ref,
    key,
    state,
    route: pageCtx?.route || null,
    params: pageCtx?.params || {},
    query: pageCtx?.query || {},
    meta: pageCtx?.meta || {},
    get components() {
      return pageCtx?.components || {};
    },
    emit: (...args) => pageCtx?.emit?.(...args),
    on: (...args) => pageCtx?.on?.(...args),
    off: (...args) => pageCtx?.off?.(...args),
    once: (...args) => pageCtx?.once?.(...args)
  };
}
