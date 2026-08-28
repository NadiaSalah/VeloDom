/**
 * ----------------------------------------
 * Module: Development Runtime Session
 * ----------------------------------------
 *
 * Maintains opt-in page, component, state, binding, DOM, and route inspection
 * data behind a versioned bounded event stream. No session exists unless the
 * development plugin is explicitly installed.
 * ----------------------------------------
 */

import {
  VELODOM_DEVTOOLS_PROTOCOL_VERSION
} from "./protocol.ts";
import { serializeDevtoolsValue } from "./serializer.ts";
import {
  attachDevtoolsRuntimeSession,
  connectDevtoolsState,
  detachDevtoolsRuntimeSession,
  disconnectDevtoolsState,
  getDevtoolsRuntimeSession
} from "./hook.ts";
import type {
  DevtoolsBindingSnapshot,
  DevtoolsEventRecord,
  DevtoolsRouteSnapshot,
  DevtoolsRuntimeSession,
  DevtoolsScopeSnapshot,
  DevtoolsSerializedValue,
  DevtoolsSessionOptions
} from "./protocol.ts";
import type {
  VeloDomApp
} from "../types.ts";

const DEFAULT_EVENT_LIMIT = 500;
const EVENT_NAMES = [
  "change",
  "click",
  "input",
  "keydown",
  "submit"
] as const;

type InspectableState = object & {
  _subscribe?(callback: () => void): () => void;
};

interface ScopeRecord {
  bindingElements: Map<string, Element>;
  cleanup(): void;
  root: Element | null;
  snapshot: DevtoolsScopeSnapshot;
  state: InspectableState;
}

/**
 * Creates and attaches one optional development session to an application.
 * Repeated installation returns the existing session so integrations can
 * compose without creating duplicate observers or event buffers.
 */
export function createDevtoolsRuntimeSession(
  app: VeloDomApp,
  options: DevtoolsSessionOptions = {}
): DevtoolsRuntimeSession {
  const existing = getDevtoolsRuntimeSession(app);

  if (existing) return existing;

  const eventLimit = normalizeEventLimit(options.eventLimit);
  const events: DevtoolsEventRecord[] = [];
  const listeners = new Set<(event: DevtoolsEventRecord) => void>();
  const records = new Map<string, ScopeRecord>();
  const stateScopeIds = new WeakMap<object, string>();
  const componentCounts = new Map<string, number>();
  let nextEventId = 1;
  let route: DevtoolsRouteSnapshot | null = null;
  let destroyed = false;

  const session: DevtoolsRuntimeSession = {
    clearEvents() {
      events.splice(0);
    },
    destroy() {
      if (destroyed) return;

      destroyed = true;
      [...records.values()].forEach(record => record.cleanup());
      records.clear();
      events.splice(0);
      listeners.clear();
      detachDevtoolsRuntimeSession(app, session);
    },
    emit(type, payload = {}) {
      const event: DevtoolsEventRecord = Object.freeze({
        id: nextEventId,
        payload: serializePayload(payload),
        timestamp: Date.now(),
        type,
        version: VELODOM_DEVTOOLS_PROTOCOL_VERSION
      });

      nextEventId += 1;
      events.push(event);
      if (events.length > eventLimit) {
        events.splice(0, events.length - eventLimit);
      }
      listeners.forEach(listener => listener(event));
      return event;
    },
    highlight(id) {
      const record = records.get(id);
      const bindingElement = record
        ? null
        : findBindingElement(records, id);
      const element = record?.root || bindingElement;

      if (!element || !(element instanceof HTMLElement)) return false;

      const previousOutline = element.style.outline;
      const previousOffset = element.style.outlineOffset;

      element.style.outline = "3px solid #4f46e5";
      element.style.outlineOffset = "3px";
      element.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
      window.setTimeout(() => {
        element.style.outline = previousOutline;
        element.style.outlineOffset = previousOffset;
      }, 1200);
      return true;
    },
    inspect() {
      syncSharedScopes(app, records, stateScopeIds, session);

      return {
        events: [...events],
        protocolVersion: VELODOM_DEVTOOLS_PROTOCOL_VERSION,
        route: route ? { ...route } : null,
        scopes: [...records.values()].map(record => ({
          ...record.snapshot,
          bindings: record.snapshot.bindings.map(binding => ({ ...binding }))
        })),
        sharedStateNames: Object.keys(app.shared || {})
      };
    },
    registerScope(scopeOptions) {
      if (destroyed) return () => {};

      const state = scopeOptions.state as InspectableState;
      const parentId = scopeOptions.parentState
        ? stateScopeIds.get(scopeOptions.parentState)
        : undefined;
      const id = createScopeId(
        scopeOptions.kind,
        scopeOptions.name,
        componentCounts
      );
      const root = scopeOptions.root || null;
      const bindings = collectBindings(root, id);
      const bindingElements = new Map(
        bindings.map(binding => [binding.snapshot.id, binding.element])
      );
      const snapshot: DevtoolsScopeSnapshot = {
        bindings: bindings.map(binding => binding.snapshot),
        id,
        kind: scopeOptions.kind,
        name: scopeOptions.name,
        parentId,
        source: scopeOptions.source,
        state: serializeDevtoolsValue(state),
        updates: 0
      };
      let active = true;
      let previousState = snapshot.state;
      const cleanupCallbacks: Array<() => void> = [];
      const unsubscribe = state._subscribe?.(() => {
        if (!active) return;

        const nextState = serializeDevtoolsValue(state);
        const changes = diffSerializedState(previousState, nextState);

        previousState = nextState;
        snapshot.state = nextState;
        snapshot.updates += 1;
        session.emit("state:update", {
          changes,
          scopeId: id,
          scopeName: scopeOptions.name
        });
      });

      if (unsubscribe) cleanupCallbacks.push(unsubscribe);
      if (root) {
        cleanupCallbacks.push(
          observeDom(root, snapshot, bindingElements, session),
          observeEvents(root, id, session)
        );
      }

      const cleanup = () => {
        if (!active) return;

        active = false;
        cleanupCallbacks.splice(0).reverse().forEach(callback => callback());
        records.delete(id);
        if (stateScopeIds.get(state) === id) stateScopeIds.delete(state);
        disconnectDevtoolsState(state, session);
      };
      const record: ScopeRecord = {
        bindingElements,
        cleanup,
        root,
        snapshot,
        state
      };

      records.set(id, record);
      stateScopeIds.set(state, id);
      connectDevtoolsState(state, session);
      session.emit(
        scopeOptions.kind === "component"
          ? "component:mount"
          : scopeOptions.kind === "page"
            ? "page:mount"
            : "state:register",
        {
          id,
          kind: scopeOptions.kind,
          name: scopeOptions.name,
          parentId: parentId || null,
          source: scopeOptions.source || null
        }
      );

      return () => {
        session.emit(
          scopeOptions.kind === "component"
            ? "component:unmount"
            : scopeOptions.kind === "page"
              ? "page:unmount"
              : "state:unregister",
          { id, kind: scopeOptions.kind, name: scopeOptions.name }
        );
        cleanup();
      };
    },
    setRoute(value) {
      route = normalizeRoute(value);
    },
    subscribe(callback) {
      if (typeof callback !== "function") {
        throw new TypeError("VeloDom devtools subscribe requires a callback");
      }

      listeners.add(callback);
      return () => listeners.delete(callback);
    }
  };

  attachDevtoolsRuntimeSession(app, session);
  return session;
}

/** Keeps optional shared-state plugins visible without coupling their setup order. */
function syncSharedScopes(
  app: VeloDomApp,
  records: Map<string, ScopeRecord>,
  stateScopeIds: WeakMap<object, string>,
  session: DevtoolsRuntimeSession
) {
  Object.entries(app.shared || {}).forEach(([name, state]) => {
    if (stateScopeIds.has(state)) return;

    session.registerScope({
      kind: "shared",
      name,
      source: "application shared state",
      state
    });
  });

  [...records.values()]
    .filter(record => record.snapshot.kind === "shared")
    .forEach(record => {
      if (app.shared?.[record.snapshot.name] === record.state) return;
      record.cleanup();
    });
}

/** Creates a stable page/shared ID or a session-local component instance ID. */
function createScopeId(
  kind: DevtoolsScopeSnapshot["kind"],
  name: string,
  componentCounts: Map<string, number>
) {
  const normalized = String(name || kind)
    .trim()
    .replace(/[^A-Za-z0-9/_-]+/g, "-");

  if (kind !== "component") return `${kind}:${normalized}`;

  const next = (componentCounts.get(normalized) || 0) + 1;

  componentCounts.set(normalized, next);
  return `${kind}:${normalized}:${next}`;
}

/** Collects normalized runtime directive bindings from one mounted root. */
function collectBindings(root: Element | null, scopeId: string) {
  if (!root) return [];

  const elements = [root, ...root.querySelectorAll("*")];
  const bindings: Array<{
    element: Element;
    snapshot: DevtoolsBindingSnapshot;
  }> = [];

  elements.forEach(element => {
    [...element.attributes].forEach(attribute => {
      if (!attribute.name.startsWith("data-vd-")) return;
      if (!attribute.value.trim()) return;

      const index = bindings.length + 1;

      bindings.push({
        element,
        snapshot: {
          directive: attribute.name.replace(/^data-/, ""),
          expression: attribute.value,
          id: `${scopeId}:binding:${index}`,
          target: describeTarget(element),
          updates: 0
        }
      });
    });
  });

  return bindings;
}

/** Observes actual DOM mutations and maps them back to discovered bindings. */
function observeDom(
  root: Element,
  scope: DevtoolsScopeSnapshot,
  bindingElements: Map<string, Element>,
  session: DevtoolsRuntimeSession
) {
  if (typeof MutationObserver === "undefined") return () => {};

  const observer = new MutationObserver(mutations => {
    const affectedBindings = new Set<string>();
    const targets = new Set<Element>();

    mutations.forEach(mutation => {
      const target = mutation.target instanceof Element
        ? mutation.target
        : mutation.target.parentElement;

      if (!target) return;

      targets.add(target);
      bindingElements.forEach((element, bindingId) => {
        if (
          element === target
          || element.contains(target)
          || target.contains(element)
        ) {
          affectedBindings.add(bindingId);
        }
      });
    });

    affectedBindings.forEach(bindingId => {
      const binding = scope.bindings.find(item => item.id === bindingId);

      if (!binding) return;
      binding.updates += 1;
      session.emit("binding:update", {
        bindingId,
        directive: binding.directive,
        expression: binding.expression,
        scopeId: scope.id,
        target: binding.target
      });
    });
    session.emit("dom:update", {
      bindings: [...affectedBindings],
      mutationCount: mutations.length,
      scopeId: scope.id,
      targets: [...targets].map(describeTarget)
    });
  });

  observer.observe(root, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true
  });
  return () => observer.disconnect();
}

/** Captures framework-authored event directives without replacing handlers. */
function observeEvents(
  root: Element,
  scopeId: string,
  session: DevtoolsRuntimeSession
) {
  const onEvent = (event: Event) => {
    const element = event.target instanceof Element
      ? findEventDirectiveElement(event.target, event.type, root)
      : null;

    if (!element) return;

    const attribute = [...element.attributes].find(item => (
      item.name === `data-vd-on-${event.type}`
      || item.name.startsWith(`data-vd-on-${event.type}-`)
    ));

    session.emit("event:dispatch", {
      event: event.type,
      expression: attribute?.value || "",
      scopeId,
      target: describeTarget(element)
    });
  };

  EVENT_NAMES.forEach(name => root.addEventListener(name, onEvent, true));
  return () => {
    EVENT_NAMES.forEach(name => root.removeEventListener(name, onEvent, true));
  };
}

/** Finds the closest matching event directive inside the registered scope. */
function findEventDirectiveElement(
  target: Element,
  eventName: string,
  root: Element
) {
  let current: Element | null = target;

  while (current && root.contains(current)) {
    if ([...current.attributes].some(attribute => (
      attribute.name === `data-vd-on-${eventName}`
      || attribute.name.startsWith(`data-vd-on-${eventName}-`)
    ))) {
      return current;
    }

    if (current === root) break;
    current = current.parentElement;
  }

  return null;
}

/** Finds the DOM element retained for one binding ID. */
function findBindingElement(
  records: Map<string, ScopeRecord>,
  id: string
) {
  for (const record of records.values()) {
    const element = record.bindingElements.get(id);
    if (element) return element;
  }

  return null;
}

/** Produces a shallow state diff from two already-safe snapshots. */
function diffSerializedState(
  previous: DevtoolsSerializedValue,
  next: DevtoolsSerializedValue
) {
  if (!isSerializedRecord(previous) || !isSerializedRecord(next)) {
    return [{ key: "*", previous, value: next }];
  }

  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);

  return [...keys]
    .filter(key => !sameSerializedValue(previous[key], next[key]))
    .map(key => ({
      key,
      previous: previous[key] ?? null,
      value: next[key] ?? null
    }));
}

/** Returns whether a serialized value is a non-array record. */
function isSerializedRecord(
  value: DevtoolsSerializedValue
): value is Record<string, DevtoolsSerializedValue> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Compares two bounded JSON-compatible values. */
function sameSerializedValue(
  left: DevtoolsSerializedValue | undefined,
  right: DevtoolsSerializedValue | undefined
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Serializes an event payload one field at a time. */
function serializePayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([name, value]) => [
      name,
      serializeDevtoolsValue(value, {
        maxDepth: 4,
        maxEntries: 50,
        maxStringLength: 500
      })
    ])
  );
}

/** Converts the public router location shape into a stable protocol snapshot. */
function normalizeRoute(value: unknown): DevtoolsRouteSnapshot | null {
  if (!value || typeof value !== "object") return null;

  const route = value as Record<string, unknown>;

  return {
    hash: String(route.hash || ""),
    matched: route.matched !== false,
    page: String(route.page || ""),
    params: normalizeStringRecord(route.params),
    path: String(route.path || "/"),
    query: normalizeQueryRecord(route.query)
  };
}

/** Normalizes route parameter values. */
function normalizeStringRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([name, entry]) => [name, String(entry)])
  );
}

/** Normalizes route query parameter values. */
function normalizeQueryRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([name, entry]) => [
      name,
      Array.isArray(entry) ? entry.map(String) : String(entry)
    ])
  );
}

/** Creates a short target description without copying DOM content. */
function describeTarget(element: Element) {
  const id = element.id ? `#${element.id}` : "";
  const component = element.getAttribute("name");
  const name = component ? `[name="${component}"]` : "";

  return `${element.tagName.toLowerCase()}${id}${name}`;
}

/** Validates the bounded event-buffer limit. */
function normalizeEventLimit(value: number | undefined) {
  if (value === undefined) return DEFAULT_EVENT_LIMIT;

  if (!Number.isInteger(value) || value < 10 || value > 5000) {
    throw new TypeError(
      "VeloDom devtools eventLimit must be an integer between 10 and 5000"
    );
  }

  return value;
}
