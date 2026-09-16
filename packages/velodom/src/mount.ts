/**
 * ----------------------------------------
 * Module: Component Mounting
 * ----------------------------------------
 *
 * Loads component resources, creates inherited reactive state, applies props,
 * slots, refs, directives, nested components, lifecycle, and expose APIs.
 * ----------------------------------------
 */

import {
  VD,
  VD_COMPILER_FEATURES,
  VD_ERROR,
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
import { renderRecoverableErrorBoundary } from "./errors/error-boundary.ts";
import {
  mergeModuleStateSeed,
  runModuleHook,
  runModuleInit
} from "./init-runner.ts";
import type { ModuleHookArguments } from "./init-runner.ts";
import { createLifecycleScope } from "./lifecycle.ts";
import type { PageEventHub } from "./events.ts";
import { evaluateExpression } from "./expression/index.ts";
import { isPlainObject } from "./shared/object.ts";
import { normalizeFolderPath } from "./shared/path.ts";
import {
  DEVTOOLS_CONTEXT
} from "./devtools/hook.ts";
import type {
  DevtoolsRuntimeSession
} from "./devtools/protocol.ts";
import type { RuntimeFeatureManifest } from "./compiler/types.ts";
import type {
  ReactiveStateMethods
} from "./reactive.ts";
import type {
  ValidatedResourceGroup
} from "./resource-adapter.ts";
import type {
  ErrorBoundaryHook,
  RouteLocation,
  StateRecord,
  UnknownRecord
} from "./types.ts";

type ComponentCleanup = () => unknown | Promise<unknown>;
type ComponentState = StateRecord & ReactiveStateMethods;
type ComponentRoot = ParentNode & {
  matches?(selector: string): boolean;
  __vdCleanup?: ComponentCleanup;
};
type ComponentElement = HTMLElement & {
  __vdCleanup?: ComponentCleanup;
};

interface ComponentPageContext {
  [DEVTOOLS_CONTEXT]?: DevtoolsRuntimeSession | null;
  page?: string;
  route?: RouteLocation | null;
  params?: Record<string, string>;
  query?: Record<string, string | string[]>;
  meta?: UnknownRecord;
  components?: UnknownRecord;
  getPageState?: (pageName: string) => ComponentState;
  hasPage?: (pageName: string) => boolean;
  navigate?: (path: string) => unknown | Promise<unknown>;
  emit?: PageEventHub["emit"];
  on?: PageEventHub["on"];
  off?: PageEventHub["off"];
  once?: PageEventHub["once"];
}

interface ComponentRuntimeContext extends ComponentPageContext {
  ref: string;
  key: string;
  state: ComponentState;
}

interface PublicComponentApi extends UnknownRecord {
  state: ComponentState;
}

interface ComponentGroupState {
  all: PublicComponentApi[];
  byKey: Record<string, PublicComponentApi>;
}

interface ComponentGroupApi extends ComponentGroupState, UnknownRecord {
  __isComponentGroup: true;
  __register(
    instance: PublicComponentApi,
    key: string
  ): () => void;
  __size(): number;
}

type ComponentRegistry = Record<string, ComponentGroupApi>;
type ComponentLifecycle = ReturnType<
  typeof createLifecycleScope<ComponentRuntimeContext>
>;
type SlotMap = Map<string, DocumentFragment[]>;

const loaded = new WeakSet<Element>();

/**
 * Mounts every component host under a DOM root.
 *
 * Architecture note: component resources are injected by an adapter, keeping
 * this runtime independent from Vite and application folder discovery.
 */
export async function mount(
  root: ComponentRoot = document,
  parentState: ComponentState | null = null,
  ancestry: string[] = [],
  pageCtx: ComponentPageContext | null = null,
  resources: Partial<ValidatedResourceGroup> = {},
  errorBoundary: ErrorBoundaryHook | null = null
): Promise<ComponentCleanup> {

  normalizeTemplateSyntax(root);

  const components = findComponents(root);

  await Promise.all(

    [...components].map(async (el) => {

      if (loaded.has(el)) return;

      loaded.add(el);

      const name = getComponentName(el);
      const folder = resolveComponentFolder(el, name);
      const recursive = ancestry.includes(folder);
      const originalChildren = cloneChildNodes(el);

      if (!folder) return;
      if (recursive) {
        reportUserActionError(`Recursive component "${folder}" blocked`, {
          code: VD_ERROR.CODES.COMPONENT_RECURSION,
          group: "component",
          title: "Recursive Component Usage",
          file: "velodom/mount.ts",
          line: 49,
          el,
          hint: "Avoid rendering the same component inside itself without a stop condition.",
          ownership: [
            ...ancestry.map(item => ({ kind: "component" as const, name: item })),
            { kind: "component", name: folder }
          ]
        });

        el.innerHTML = `
          <div>
            Recursive component "${folder}" blocked
          </div>
        `;
        return;
      }

      let cleanup: ComponentCleanup | null = null;
      let state: ComponentState | null = null;
      let unregisterInstance: ComponentCleanup | null = null;
      let componentModule: UnknownRecord | null = null;
      let lifecycle: ComponentLifecycle | null = null;
      let hookArgs: ModuleHookArguments | null = null;
      let devtoolsCleanup: (() => void) | null = null;

      try {

        const loadHtml = resources.html?.[folder];

        if (!loadHtml) {
          throw new Error(`Component "${folder}" not found`);
        }

        const slots = collectSlots(el);
        const loadManifest = resources.manifests?.[folder];
        const [html, manifest] = await Promise.all([
          loadHtml(),
          loadManifest?.() ?? null
        ]);

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
        devtoolsCleanup = pageCtx?.[DEVTOOLS_CONTEXT]?.registerScope({
          kind: "component",
          name: folder,
          parentState,
          root: el,
          source: `src/components/${folder}`,
          state
        }) || null;
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

        let moduleResult: unknown = null;

        if (loadModule) {

          componentModule = await loadModule();
          mergeModuleStateSeed(state, componentModule, "component");
          moduleResult = await runModuleInit(
            componentModule.init || componentModule.default,
            hookArgs
          );

          mergeState(state, moduleResult);
          mergeExposedMembers(state, getModuleExpose(moduleResult));
        }

        unregisterInstance = registerComponentInstance(
          el,
          parentState,
          state,
          getModuleExpose(moduleResult)
        );

        const directivesCleanup = await applyDirectives(el, state, {
          el,
          props,
          page: pageCtx?.page || "",
          getPageState: pageCtx?.getPageState || null,
          hasPage: pageCtx?.hasPage || null,
          navigate: pageCtx?.navigate || null,
          features: manifest?.features,
          mountComponents: (root, scopedState) => mount(
            root,
            scopedState,
            [...ancestry, folder],
            pageCtx,
            resources,
            errorBoundary
          )
        });

        const childrenCleanup = shouldMountChildren(manifest)
          ? await mount(
            el,
            state,
            [...ancestry, folder],
            pageCtx,
            resources,
            errorBoundary
          )
          : null;

        cleanup = once(async () => {
          await childrenCleanup?.();
          unregisterInstance?.();
          directivesCleanup?.();
          devtoolsCleanup?.();
          devtoolsCleanup = null;
          if (hookArgs) {
            await runModuleHook(componentModule?.destroy, hookArgs);
          }
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
        devtoolsCleanup?.();
        devtoolsCleanup = null;
        await lifecycle?.dispose();
        state?._dispose?.();
        loaded.delete(el);
        delete el[VD_INTERNAL.CLEANUP_KEY];

        const recovered = typeof errorBoundary === "function"
          ? await renderRecoverableErrorBoundary(err, {
            code: VD_ERROR.CODES.COMPONENT_CRASH,
            group: "component",
            title: `Component Crash: ${name || "Unknown"}`,
            target: el,
            phase: "component",
            hook: errorBoundary,
            file: "velodom/mount.ts",
            line: 62,
            page: pageCtx?.page,
            component: folder || name || "unknown",
            ownership: [
              ...(pageCtx?.page ? [{ kind: "page" as const, name: pageCtx.page }] : []),
              { kind: "component", name: folder || name || "unknown" }
            ],
            hint: "Verify the component folder, script.js/script.ts exports, and template expressions.",
            retry: () => {
              resetComponentHost(el, originalChildren);
              loaded.delete(el);

              return mount(
                el,
                parentState,
                ancestry,
                pageCtx,
                resources,
                errorBoundary
              );
            }
          })
          : false;

        if (!recovered) {
          reportUserActionError(err, {
            code: VD_ERROR.CODES.COMPONENT_CRASH,
            group: "component",
            title: `Component Crash: ${name || "Unknown"}`,
            file: "velodom/mount.ts",
            line: 62,
            hint: "Verify the component folder, script.js/script.ts exports, and template expressions.",
            ownership: [
              ...(pageCtx?.page ? [{ kind: "page" as const, name: pageCtx.page }] : []),
              { kind: "component", name: folder || name || "unknown" }
            ],
            fatal: true
          });
        }
      }

    })

  );

  return () => {
    return disposeTree(root);
  };
}

/** Evaluates the `shouldMountChildren()` condition for the supplied input. */
function shouldMountChildren(
  manifest: RuntimeFeatureManifest | null | undefined
): boolean {
  return !manifest || manifest.features.includes(
    VD_COMPILER_FEATURES.COMPONENTS
  );
}

/** Reads the optional component expose object from an init result. */
function getModuleExpose(result: unknown): unknown {
  return isPlainObject(result)
    ? result.expose
    : undefined;
}

/** Returns component props collected from object and attribute bindings. */
function getProps(
  el: HTMLElement,
  parentState: ComponentState | null
): UnknownRecord {

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

    const ignore: readonly string[] = [
      VD.REF,
      VD.IF,
      VD.SHOW,
      VD.ELSEIF,
      VD.ELSE,
      VD.FOR,
      VD.MODEL,
      VD.TEXT,
      VD.PRE,
      VD.SRC,
      VD.HREF,
      VD.STYLE,
      VD.CLASS,
      VD.DEBOUNCE,
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
      VD.AUTO_STATE,
      VD.PARAMS,
      VD.TARGET,
      VD.STATE,
      VD.LOADING,
      VD.ERROR,
      VD.RTL_FLIP
    ];

    if (ignore.includes(attr.name)) return;

    const key = attr.name.replace("data-vd-", "");

    props[key] = attr.value;

  });

  return props;
}

/** Parses an optional object expression used by `vd-props`. */
function parsePropsObject(
  expression: string | null,
  state: ComponentState | null
): UnknownRecord {
  if (!expression) return {};

  try {
    const result = evaluateExpression(expression, {
      state: state || {}
    });

    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return {};
    }

    return result as UnknownRecord;
  } catch (err) {
    reportUserActionError(err, {
      title: "Invalid Component Props Expression",
      directive: VD.PROPS,
      expression,
      file: "velodom/mount.ts",
      line: 200,
      hint: "Use a valid object expression. Example: { name: userName, age: 20 }"
    });

    return {};
  }
}

/** Finds the components. */
function findComponents(root: ComponentRoot): ComponentElement[] {
  const selector = VD.selector(VD.COMPONENT);
  const components: ComponentElement[] = [];

  if (root instanceof HTMLElement && root.matches(selector)) {
    components.push(root as ComponentElement);
  }

  components.push(...root.querySelectorAll<ComponentElement>(selector));

  return components;
}

/** Returns the component name. */
function getComponentName(el: HTMLElement): string {
  return (
    el.getAttribute(VD.COMPONENT)
    || el.getAttribute("name")
    || el.id
  );
}

/** Resolves the component folder. */
function resolveComponentFolder(el: HTMLElement, name: string): string {
  const componentName = (name || "").trim();

  if (!componentName) return "";

  const base = normalizeFolderPath(
    el.getAttribute(VD.PATH)
  );

  return base
    ? `${base}/${componentName}`
    : componentName;
}

/** Collects the slots. */
function collectSlots(el: HTMLElement): SlotMap {
  normalizeSlotSyntax(el);

  const slots: SlotMap = new Map();
  const slotNodes = [...el.children]
    .filter(node => node.hasAttribute(VD.CHILD))
    .map(node => node as HTMLElement);

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

/** Applies the slots. */
function applySlots(el: HTMLElement, slots: SlotMap): void {
  const outlets = findSlotOutlets(el);

  outlets.forEach(outlet => {
    const name = normalizeSlotName(
      outlet.getAttribute(VD.GET_CHILD)
    );
    const queue = slots.get(name);

    if (!queue?.length) return;

    const fragment = queue.shift();

    if (fragment) {
      outlet.replaceChildren(fragment);
    }
  });
}

/** Finds the slot outlets. */
function findSlotOutlets(root: HTMLElement): HTMLElement[] {
  const selector = VD.selector(VD.GET_CHILD);
  const outlets: HTMLElement[] = [];

  if (root.matches?.(selector)) {
    outlets.push(root);
  }

  outlets.push(...root.querySelectorAll<HTMLElement>(selector));

  return outlets;
}

/** Normalizes the slot name. */
function normalizeSlotName(name: string | null): string {
  return (name || "").trim();
}

/** Extracts the slot fragment. */
function extractSlotFragment(node: HTMLElement): DocumentFragment {
  const fragment = document.createDocumentFragment();

  if (node.tagName === "TEMPLATE") {
    fragment.append((node as HTMLTemplateElement).content.cloneNode(true));
    return fragment;
  }

  if (isCustomSlotTag(node)) {
    [...node.childNodes].forEach(child => {
      fragment.append(child.cloneNode(true));
    });
    return fragment;
  }

  const clone = node.cloneNode(true) as HTMLElement;
  clone.removeAttribute(VD.CHILD);
  fragment.append(clone);

  return fragment;
}

/** Normalizes the template syntax. */
function normalizeTemplateSyntax(root: ComponentRoot): void {
  normalizeComponentTags(root);
  normalizeSlotSyntax(root);
}

/** Normalizes the component tags. */
function normalizeComponentTags(root: ComponentRoot): void {
  const candidates: HTMLElement[] = [];

  if (
    root instanceof HTMLElement
    && root.matches(VD.COMPONENT_TAG_SELECTOR)
  ) {
    candidates.push(root);
  }

  candidates.push(
    ...root.querySelectorAll<HTMLElement>(VD.COMPONENT_TAG_SELECTOR)
  );

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

/** Normalizes the slot syntax. */
function normalizeSlotSyntax(root: ComponentRoot | HTMLElement): void {
  const candidates = [
    ...root.querySelectorAll<HTMLElement>(VD.SLOT_TAG_SELECTOR)
  ];

  candidates.forEach(node => {
    if (node.hasAttribute(VD.CHILD)) return;

    const name = node.getAttribute("name") || "";

    node.setAttribute(VD.CHILD, name);
    node.removeAttribute("name");
  });
}

/** Evaluates the `shouldUnwrapComponent()` condition for the supplied input. */
function shouldUnwrapComponent(el: HTMLElement): boolean {
  return el.getAttribute(VD.HOSTLESS) === "true";
}

/** Unwraps the component. */
function unwrapComponent(el: ComponentElement): void {
  const scopeId = el.getAttribute(VD.SCOPE);
  const fragment = document.createDocumentFragment();
  const cleanup = el[VD_INTERNAL.CLEANUP_KEY];
  const runCleanup = once(() => cleanup?.());

  if (scopeId) {
    [...el.children].forEach(child => {
      if (child.tagName === "STYLE") return;

      child.setAttribute(VD.SCOPE, scopeId);
      (child as ComponentElement)[VD_INTERNAL.CLEANUP_KEY] = runCleanup;
    });
  }

  if (!scopeId) {
    [...el.children].forEach(child => {
      (child as ComponentElement)[VD_INTERNAL.CLEANUP_KEY] = runCleanup;
    });
  }

  while (el.firstChild) {
    fragment.append(el.firstChild);
  }

  el.replaceWith(fragment);
}

/** Evaluates the `isCustomSlotTag()` condition for the supplied input. */
function isCustomSlotTag(node: HTMLElement): boolean {
  return ["VD-CHILD", "CHILD", "CHILED"]
    .includes(node.tagName);
}

/** Disposes every component cleanup callback attached to a DOM subtree. */
export async function disposeTree(root: ComponentRoot | null): Promise<void> {
  const callbacks = new Set<ComponentCleanup>();

  const rootCleanup = root?.[VD_INTERNAL.CLEANUP_KEY];

  if (typeof rootCleanup === "function") {
    callbacks.add(rootCleanup);
  }

  root?.querySelectorAll?.("*")
    .forEach(node => {
      const owner = node as ComponentElement;

      const cleanup = owner[VD_INTERNAL.CLEANUP_KEY];

      if (typeof cleanup === "function") {
        callbacks.add(cleanup);
      }
    });

  for (const callback of callbacks) {
    await callback();
  }
}

/** Performs the internal `once()` operation. */
function once<TResult>(fn: () => TResult): () => TResult | undefined {
  let called = false;

  return () => {
    if (called) return undefined;

    called = true;
    return fn();
  };
}

/** Registers the component instance. */
function registerComponentInstance(
  el: HTMLElement,
  parentState: ComponentState | null,
  state: ComponentState,
  expose: unknown
): ComponentCleanup | null {
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

/** Ensures the component registry. */
function ensureComponentRegistry(
  state: ComponentState | null
): ComponentRegistry | null {
  if (!state || typeof state !== "object") return null;

  if (!isPlainObject(state.components)) {
    state.components = {};
  }

  return state.components as ComponentRegistry;
}

/** Creates the public component instance API. */
function createPublicInstanceApi(
  state: ComponentState,
  expose: unknown
): PublicComponentApi {
  const api: PublicComponentApi = {
    state
  };
  const members = isPlainObject(expose)
    ? expose
    : collectStateFunctions(state);

  Object.entries(members).forEach(([name, value]) => {
    if (typeof value === "function") {
      api[name] = (...args: unknown[]) => Reflect.apply(value, state, args);
      return;
    }

    api[name] = value;
  });

  return api;
}

/** Ensures the component group. */
function ensureComponentGroup(
  registry: ComponentRegistry,
  refName: string
): ComponentGroupApi {
  const existing = registry[refName];

  if (existing?.__isComponentGroup) {
    return existing;
  }

  const groupState: ComponentGroupState = {
    all: [],
    byKey: {}
  };

  /** Adds one mounted instance to this component-ref group. */
  function registerInstance(
    instance: PublicComponentApi,
    key: string
  ): () => void {
    groupState.all.push(instance);

    if (key) {
      groupState.byKey[key] = instance;
    }

    return () => {
      const index = groupState.all.indexOf(instance);

      if (index !== -1) {
        groupState.all.splice(index, 1);
      }

      if (key && groupState.byKey[key] === instance) {
        delete groupState.byKey[key];
      }
    };
  }

  const groupApi = new Proxy(groupState as ComponentGroupApi, {
    get(target, prop, receiver) {
      if (prop === "__isComponentGroup") return true;
      if (prop === "__register") return registerInstance;
      if (prop === "__size") return () => target.all.length;
      if (prop === "state") return target.all[0]?.state;
      if (prop === "length") return target.all.length;
      if (prop === "first") return target.all[0];

      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }

      if (typeof prop !== "string") {
        return Reflect.get(target, prop, receiver);
      }

      return (...args: unknown[]) => {
        const results: unknown[] = [];

        target.all.forEach(instance => {
          const method = instance[prop];

          if (typeof method === "function") {
            results.push(Reflect.apply(method, instance, args));
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

/** Collects the state functions. */
function collectStateFunctions(state: ComponentState): UnknownRecord {
  return Object.keys(state)
    .filter(key => typeof state[key] === "function")
    .reduce((acc, key) => {
      acc[key] = state[key];
      return acc;
    }, {} as UnknownRecord);
}

/** Returns the component key. */
function getComponentKey(el: HTMLElement): string {
  const raw = el.getAttribute(VD.KEY);

  if (raw === null || raw === undefined) return "";

  return String(raw).trim();
}

/** Clones the child nodes. */
function cloneChildNodes(el: HTMLElement): Node[] {
  return [...el.childNodes].map(node => node.cloneNode(true));
}

/** Resets the component host. */
function resetComponentHost(el: HTMLElement, children: readonly Node[]): void {
  el.replaceChildren(...children.map(node => node.cloneNode(true)));
}

/** Creates the component context. */
function createComponentContext(
  el: HTMLElement,
  pageCtx: ComponentPageContext | null,
  state: ComponentState
): ComponentRuntimeContext {
  const ref = (el.getAttribute(VD.REF) || "").trim();
  const key = getComponentKey(el);

  return {
    [DEVTOOLS_CONTEXT]: pageCtx?.[DEVTOOLS_CONTEXT] || null,
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
    emit: (eventName: string, payload?: unknown) => (
      pageCtx?.emit?.(eventName, payload)
    ),
    on: (eventName: string, handler) => (
      pageCtx?.on?.(eventName, handler) || (() => {})
    ),
    off: (eventName: string, handler) => pageCtx?.off?.(eventName, handler),
    once: (eventName: string, handler) => (
      pageCtx?.once?.(eventName, handler) || (() => {})
    )
  };
}
