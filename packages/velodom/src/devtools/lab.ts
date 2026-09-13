/**
 * ----------------------------------------
 * Module: VeloDom Lab Interface
 * ----------------------------------------
 *
 * Renders the optional local development interface over the versioned
 * devtools bridge. Dynamic application data is always written as text.
 * ----------------------------------------
 */

import {
  VD_DEVTOOLS
} from "../constants.ts";
import type {
  DevtoolsBridge,
  DevtoolsSnapshot
} from "../types.ts";
import type {
  DevtoolsCompilerRecord,
  DevtoolsEventRecord,
  DevtoolsScopeSnapshot
} from "./protocol.ts";

/** Options for mounting the optional local Lab interface. */
export interface VeloDomLabOptions {
  /** Bridge global configured by the development plugin. */
  globalName?: string;
  /** Local Vite endpoint that returns compiler metadata. */
  metadataUrl?: string;
  /** Whether the panel starts open. Defaults to the persisted preference. */
  open?: boolean;
  /** Element receiving the isolated Lab host. Defaults to document.body. */
  target?: HTMLElement;
}

/** Control surface returned by the mounted Lab interface. */
export interface VeloDomLabHandle {
  close(): void;
  destroy(): void;
  open(): void;
  refresh(): Promise<void>;
}

type LabTab = "compiler" | "components" | "overview" | "requests" | "state" | "timeline";
type LabTheme = "dark" | "light" | "system";

interface LabViewState {
  bridge: DevtoolsBridge | null;
  compiler: DevtoolsCompilerRecord[];
  filter: string;
  snapshot: DevtoolsSnapshot | null;
  tab: LabTab;
  theme: LabTheme;
}

const LAB_ATTRIBUTE = "data-velodom-lab";
const LAB_OPEN_KEY = "velodom:lab:open";
const LAB_THEME_KEY = "velodom:lab:theme";
const DEFAULT_METADATA_URL = "/__velodom_lab__/metadata";
const TABS: Array<{ id: LabTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "components", label: "Components" },
  { id: "state", label: "State" },
  { id: "requests", label: "Requests" },
  { id: "timeline", label: "Timeline" },
  { id: "compiler", label: "Compiler" }
];

/**
 * Mounts the complete optional Lab panel and connects when the runtime bridge
 * becomes available. The returned handle remains usable while connection is
 * pending, which avoids racing the application's module startup.
 */
export function mountVeloDomLab(
  options: VeloDomLabOptions = {}
): VeloDomLabHandle {
  if (typeof document === "undefined" || typeof window === "undefined") {
    throw new Error("VeloDom Lab requires a browser document.");
  }

  const existing = document.querySelector<HTMLElement>(`[${LAB_ATTRIBUTE}]`);

  if (existing?.__vdLabHandle) return existing.__vdLabHandle;

  const target = options.target || document.body;
  const globalName = options.globalName || VD_DEVTOOLS.GLOBAL_NAME;
  const metadataUrl = options.metadataUrl || DEFAULT_METADATA_URL;
  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "open" });
  const view: LabViewState = {
    bridge: null,
    compiler: [],
    filter: "",
    snapshot: null,
    tab: "overview",
    theme: readThemePreference()
  };
  let removeSubscription: (() => void) | null = null;
  let connectTimer = 0;
  let refreshScheduled = false;
  let destroyed = false;

  host.setAttribute(LAB_ATTRIBUTE, "");
  shadow.append(createLabStyle(), createLabStructure());
  target.append(host);

  const panel = requireShadowElement<HTMLElement>(shadow, ".vd-lab");
  const toggle = requireShadowElement<HTMLButtonElement>(shadow, ".vd-lab-toggle");
  const closeButton = requireShadowElement<HTMLButtonElement>(shadow, "[data-action='close']");
  const refreshButton = requireShadowElement<HTMLButtonElement>(shadow, "[data-action='refresh']");
  const clearButton = requireShadowElement<HTMLButtonElement>(shadow, "[data-action='clear']");
  const themeButton = requireShadowElement<HTMLButtonElement>(shadow, "[data-action='theme']");
  const search = requireShadowElement<HTMLInputElement>(shadow, ".vd-lab-search");

  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    toggle.hidden = open;
    toggle.setAttribute("aria-expanded", String(open));
    persistPreference(LAB_OPEN_KEY, String(open));
  };
  const scheduleRefresh = () => {
    if (refreshScheduled || destroyed) return;

    refreshScheduled = true;
    queueMicrotask(() => {
      refreshScheduled = false;
      void refresh();
    });
  };
  const onCompilerUpdate = () => scheduleRefresh();
  const connect = () => {
    if (destroyed || view.bridge) return;

    const candidate = (window as unknown as Record<string, unknown>)[globalName];

    if (isLabBridge(candidate)) {
      view.bridge = candidate;
      removeSubscription = candidate.subscribe(scheduleRefresh);
      void refresh();
      return;
    }

    connectTimer = window.setTimeout(connect, 50);
  };
  const refresh = async () => {
    if (destroyed) return;

    view.snapshot = view.bridge?.inspect() || null;
    view.compiler = await readCompilerRecords(metadataUrl);
    renderLab(shadow, view);
  };
  const handle: VeloDomLabHandle = {
    close: () => setOpen(false),
    destroy() {
      if (destroyed) return;

      destroyed = true;
      window.clearTimeout(connectTimer);
      removeSubscription?.();
      import.meta.hot?.off(
        "velodom:lab:compiler-update",
        onCompilerUpdate
      );
      window.removeEventListener("keydown", onWindowKeydown);
      host.remove();
    },
    open: () => setOpen(true),
    refresh
  };

  Object.defineProperty(host, "__vdLabHandle", {
    configurable: true,
    value: handle
  });

  toggle.addEventListener("click", () => setOpen(true));
  closeButton.addEventListener("click", () => setOpen(false));
  refreshButton.addEventListener("click", () => void refresh());
  clearButton.addEventListener("click", () => {
    view.bridge?.clearEvents();
    void refresh();
  });
  themeButton.addEventListener("click", () => {
    view.theme = nextTheme(view.theme);
    persistPreference(LAB_THEME_KEY, view.theme);
    renderLab(shadow, view);
  });
  search.addEventListener("input", () => {
    view.filter = search.value.trim().toLowerCase();
    renderLab(shadow, view);
  });
  requireShadowElement(shadow, ".vd-lab-tabs").addEventListener("click", event => {
    const button = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>("[data-tab]")
      : null;

    if (!button) return;
    view.tab = button.dataset.tab as LabTab;
    renderLab(shadow, view);
  });
  requireShadowElement(shadow, ".vd-lab-content").addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    const copyButton = target?.closest<HTMLButtonElement>("[data-copy]");

    if (copyButton) {
      void copyDiagnosticCommand(copyButton);
      return;
    }

    const button = target
      ? target.closest<HTMLButtonElement>("[data-highlight]")
      : null;

    if (!button) return;
    view.bridge?.highlight(button.dataset.highlight || "");
  });

  /** Opens the Lab command surface with the platform-standard shortcut. */
  function onWindowKeydown(event: KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
      return;
    }

    event.preventDefault();
    setOpen(true);
    search.focus();
  }

  window.addEventListener("keydown", onWindowKeydown);
  import.meta.hot?.on(
    "velodom:lab:compiler-update",
    onCompilerUpdate
  );
  setOpen(options.open ?? readOpenPreference());
  renderLab(shadow, view);
  connect();
  return handle;
}

declare global {
  interface HTMLElement {
    __vdLabHandle?: VeloDomLabHandle;
  }
}

/** Renders the active Lab view from one immutable bridge snapshot. */
function renderLab(shadow: ShadowRoot, view: LabViewState) {
  const root = requireShadowElement<HTMLElement>(shadow, ".vd-lab");
  const status = requireShadowElement<HTMLElement>(shadow, ".vd-lab-status");
  const content = requireShadowElement<HTMLElement>(shadow, ".vd-lab-content");
  const theme = requireShadowElement<HTMLButtonElement>(shadow, "[data-action='theme']");

  root.dataset.theme = view.theme;
  status.textContent = view.snapshot
    ? `Protocol v${view.snapshot.protocolVersion} · connected`
    : "Waiting for VeloDom runtime…";
  theme.textContent = `Theme: ${capitalize(view.theme)}`;
  TABS.forEach(tab => {
    const button = requireShadowElement<HTMLButtonElement>(
      shadow,
      `[data-tab='${tab.id}']`
    );
    const active = tab.id === view.tab;

    button.dataset.active = String(active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  content.replaceChildren(renderActiveView(view));
}

/** Selects the renderer for the active Lab tab. */
function renderActiveView(view: LabViewState) {
  if (!view.snapshot) {
    return createEmptyState(
      "Connecting to the optional development bridge. Start the app with `vd lab`."
    );
  }

  switch (view.tab) {
    case "components":
      return renderComponents(view.snapshot.scopes, view.filter);
    case "state":
      return renderState(
        view.snapshot.scopes,
        view.snapshot.events,
        view.filter
      );
    case "requests":
      return renderRequests(view.snapshot.events, view.filter);
    case "timeline":
      return renderTimeline(view.snapshot.events, view.filter);
    case "compiler":
      return renderCompiler(view.compiler, view.filter);
    default:
      return renderOverview(view.snapshot);
  }
}

/** Renders route and live-count summaries. */
function renderOverview(snapshot: DevtoolsSnapshot) {
  const fragment = document.createDocumentFragment();
  const grid = createElement("div", "vd-summary-grid");
  const route = snapshot.route;
  const pageCount = snapshot.scopes.filter(scope => scope.kind === "page").length;
  const componentCount = snapshot.scopes.filter(scope => scope.kind === "component").length;

  grid.append(
    createMetric("Route", route ? `${route.path}${route.hash}` : "Not mounted"),
    createMetric("Pages", String(pageCount)),
    createMetric("Components", String(componentCount)),
    createMetric("Events", String(snapshot.events.length))
  );
  fragment.append(
    createSectionHeading("Runtime overview", "Live, read-only values from the active app."),
    grid
  );

  if (route) {
    fragment.append(createCodeBlock({
      page: route.page,
      params: route.params,
      query: route.query
    }));
  }

  return fragment;
}

/** Renders the mounted page/component hierarchy. */
function renderComponents(scopes: DevtoolsScopeSnapshot[], filter: string) {
  const fragment = document.createDocumentFragment();
  const visible = orderOwnershipScopes(scopes, filter);

  fragment.append(createSectionHeading(
    "Mounted scopes",
    "Select a real mounted scope to highlight its DOM boundary."
  ));
  if (!visible.length) {
    fragment.append(createEmptyState("No matching mounted pages or components."));
    return fragment;
  }

  const list = createElement("ol", "vd-list");

  visible.forEach(({ depth, scope }) => {
    const item = createElement("li", "vd-scope");
    const button = createElement("button", "vd-scope-button") as HTMLButtonElement;
    const label = createElement("span", "vd-scope-name");
    const meta = createElement("span", "vd-scope-meta");

    button.type = "button";
    button.dataset.highlight = scope.id;
    label.textContent = scope.name;
    meta.textContent = `${scope.kind} · ${scope.bindings.length} bindings · ${scope.updates} updates`;
    button.style.setProperty("--vd-depth", String(depth));
    button.append(label, meta);
    item.append(button);
    list.append(item);
  });
  fragment.append(list);
  return fragment;
}

/** Orders mounted scopes as a real parent/child ownership tree. */
function orderOwnershipScopes(
  scopes: DevtoolsScopeSnapshot[],
  filter: string
) {
  const candidates = scopes.filter(scope => scope.kind !== "shared");
  const byId = new Map(candidates.map(scope => [scope.id, scope]));
  const included = new Set<string>();

  candidates.forEach(scope => {
    if (!matchesFilter(filter, scope.name, scope.source)) return;

    let current: DevtoolsScopeSnapshot | undefined = scope;
    while (current && !included.has(current.id)) {
      included.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
  });

  const children = new Map<string, DevtoolsScopeSnapshot[]>();
  const roots: DevtoolsScopeSnapshot[] = [];
  candidates.filter(scope => included.has(scope.id)).forEach(scope => {
    if (!scope.parentId || !byId.has(scope.parentId)) {
      roots.push(scope);
      return;
    }

    const siblings = children.get(scope.parentId) || [];
    siblings.push(scope);
    children.set(scope.parentId, siblings);
  });
  const ordered: Array<{ depth: number; scope: DevtoolsScopeSnapshot }> = [];
  const visited = new Set<string>();
  const visit = (scope: DevtoolsScopeSnapshot, depth: number) => {
    if (visited.has(scope.id)) return;
    visited.add(scope.id);
    ordered.push({ depth, scope });
    (children.get(scope.id) || []).forEach(child => visit(child, depth + 1));
  };

  roots.forEach(root => visit(root, 0));
  candidates.filter(scope => included.has(scope.id) && !visited.has(scope.id))
    .forEach(scope => visit(scope, 0));

  return ordered;
}

/** Renders bounded state snapshots and their bindings. */
function renderState(
  scopes: DevtoolsScopeSnapshot[],
  events: DevtoolsEventRecord[],
  filter: string
) {
  const fragment = document.createDocumentFragment();
  const visible = scopes.filter(scope => matchesFilter(filter, scope.name));

  fragment.append(createSectionHeading(
    "Reactive state",
    "Functions and unsafe accessors are represented, never executed."
  ));
  if (!visible.length) {
    fragment.append(createEmptyState("No matching reactive scopes."));
    return fragment;
  }

  visible.forEach(scope => {
    const details = createElement("details", "vd-details") as HTMLDetailsElement;
    const summary = document.createElement("summary");
    const bindings = scope.bindings.filter(binding => matchesFilter(
      filter,
      binding.directive,
      binding.expression,
      binding.target
    ));

    summary.textContent = `${scope.kind}: ${scope.name}`;
    details.append(summary, createCodeBlock(scope.state));
    const diffs = events.filter(event => (
      event.type === "state:update"
      && readPayloadString(event, "scopeId") === scope.id
    )).slice(-5).reverse();

    if (diffs.length) {
      const diffHeading = createElement("strong", "vd-subheading");
      diffHeading.textContent = "Recent state diffs";
      details.append(diffHeading);
      diffs.forEach(event => details.append(createCodeBlock({
        changes: event.payload.changes,
        timestamp: new Date(event.timestamp).toISOString()
      })));
    }
    if (bindings.length) {
      const list = createElement("ul", "vd-binding-list");

      bindings.forEach(binding => {
        const item = document.createElement("li");
        const button = document.createElement("button");

        button.type = "button";
        button.dataset.highlight = binding.id;
        button.textContent = `${binding.directive}="${binding.expression}" → ${binding.target}`;
        item.append(button);
        list.append(item);
      });
      details.append(list);
    }
    fragment.append(details);
  });
  return fragment;
}

interface LabRequestRecord {
  durationMs: number | null;
  error: string;
  id: string;
  route: string;
  startedAt: number;
  status: string;
  target: string;
}

/** Renders paired request lifecycle events as a compact waterfall. */
function renderRequests(events: DevtoolsEventRecord[], filter: string) {
  const fragment = document.createDocumentFragment();
  const visible = createRequestRecords(events).filter(request => matchesFilter(
    filter,
    request.route,
    request.status,
    request.target,
    request.error
  ));

  fragment.append(createSectionHeading(
    "Request waterfall",
    "Lifecycle timing and status only; request and response payloads are never captured."
  ));
  if (!visible.length) {
    fragment.append(createEmptyState("Run a declarative request to record its lifecycle."));
    return fragment;
  }

  const maxDuration = Math.max(
    1,
    ...visible.map(request => request.durationMs || 0)
  );
  const list = createElement("ol", "vd-timeline");

  visible.slice().reverse().forEach(request => {
    const item = document.createElement("li");
    const heading = createElement("div", "vd-event-heading");
    const name = document.createElement("strong");
    const duration = document.createElement("span");
    const bar = createElement("div", "vd-waterfall-track");
    const fill = createElement("span", "vd-waterfall-fill");

    name.textContent = `${request.route} · ${request.status}`;
    duration.textContent = request.durationMs === null
      ? "pending"
      : `${request.durationMs.toFixed(1)} ms`;
    fill.style.width = `${Math.max(3, ((request.durationMs || 0) / maxDuration) * 100)}%`;
    bar.append(fill);
    heading.append(name, duration);
    item.append(heading, bar);
    if (request.target || request.error) {
      item.append(createCodeBlock({
        error: request.error || undefined,
        target: request.target || undefined
      }));
    }
    list.append(item);
  });
  fragment.append(list);
  return fragment;
}

/** Pairs request start/end/error events by their internal development ID. */
function createRequestRecords(events: DevtoolsEventRecord[]) {
  const records: LabRequestRecord[] = [];
  const byId = new Map<string, LabRequestRecord>();

  events.forEach(event => {
    if (!event.type.startsWith("request:")) return;

    const route = readPayloadString(event, "route");
    const requestId = readPayloadString(event, "requestId")
      || `legacy:${route}:${event.id}`;
    let record = byId.get(requestId);

    if (event.type === "request:start") {
      record = {
        durationMs: null,
        error: "",
        id: requestId,
        route,
        startedAt: event.timestamp,
        status: "pending",
        target: readPayloadString(event, "target")
      };
      byId.set(requestId, record);
      records.push(record);
      return;
    }

    if (!record) {
      record = [...records].reverse().find(item => (
        item.route === route && item.status === "pending"
      ));
    }
    if (!record) return;

    const duration = readPayloadNumber(event, "durationMs");
    if (duration !== null) record.durationMs = duration;
    if (event.type === "request:error") {
      record.error = readPayloadString(event, "message");
      record.status = "error";
    } else {
      record.status = readPayloadString(event, "status") || record.status;
    }
  });

  return records;
}

/** Renders the real bounded development event stream. */
function renderTimeline(events: DevtoolsEventRecord[], filter: string) {
  const fragment = document.createDocumentFragment();
  const transitions = createRouteTransitionRecords(events).filter(record => (
    matchesFilter(filter, record.path, record.status, record.from)
  ));
  const visible = [...events]
    .reverse()
    .filter(event => matchesFilter(
      filter,
      event.type,
      JSON.stringify(event.payload)
    ));

  fragment.append(createSectionHeading(
    "Route-transition timeline",
    "Navigation timing is paired by ID; the complete bounded event stream follows."
  ));
  if (transitions.length) {
    const routeList = createElement("ol", "vd-timeline");

    transitions.slice().reverse().forEach(record => {
      const item = document.createElement("li");
      const heading = createElement("div", "vd-event-heading");
      const name = document.createElement("strong");
      const duration = document.createElement("span");

      name.textContent = `${record.from || "start"} → ${record.path} · ${record.status}`;
      duration.textContent = record.durationMs === null
        ? "pending"
        : `${record.durationMs.toFixed(1)} ms`;
      heading.append(name, duration);
      item.append(heading);
      routeList.append(item);
    });
    fragment.append(routeList);
  }

  fragment.append(createSectionHeading(
    "Complete event stream",
    "Newest first. The buffer is bounded and can be cleared safely."
  ));
  if (!visible.length) {
    fragment.append(createEmptyState("Interact with the app to record development events."));
    return fragment;
  }

  const list = createElement("ol", "vd-timeline");

  visible.forEach(event => {
    const item = document.createElement("li");
    const heading = createElement("div", "vd-event-heading");
    const name = document.createElement("strong");
    const time = document.createElement("time");

    name.textContent = event.type;
    time.dateTime = new Date(event.timestamp).toISOString();
    time.textContent = new Date(event.timestamp).toLocaleTimeString();
    heading.append(name, time);
    item.append(heading, createCodeBlock(event.payload));
    list.append(item);
  });
  fragment.append(list);
  return fragment;
}

/** Pairs route navigation events for reliable concurrent transition timing. */
function createRouteTransitionRecords(events: DevtoolsEventRecord[]) {
  const records: Array<{
    durationMs: number | null;
    from: string;
    id: string;
    path: string;
    status: string;
  }> = [];
  const byId = new Map<string, typeof records[number]>();

  events.forEach(event => {
    if (!event.type.startsWith("route:navigate:")) return;

    const id = readPayloadString(event, "navigationId") || `legacy:${event.id}`;
    if (event.type === "route:navigate:start") {
      const record = {
        durationMs: null,
        from: readPayloadString(event, "from"),
        id,
        path: readPayloadString(event, "path"),
        status: "pending"
      };
      byId.set(id, record);
      records.push(record);
      return;
    }

    const record = byId.get(id)
      || [...records].reverse().find(item => item.status === "pending");
    if (!record) return;

    record.durationMs = readPayloadNumber(event, "durationMs");
    record.status = event.type.endsWith(":error") ? "error" : "complete";
    record.path ||= readPayloadString(event, "path");
  });

  return records;
}

/** Renders source-derived compiler metadata supplied by the Vite endpoint. */
function renderCompiler(records: DevtoolsCompilerRecord[], filter: string) {
  const fragment = document.createDocumentFragment();
  const visible = records.filter(record => matchesFilter(
    filter,
    record.file,
    ...record.features,
    ...record.directives.map(directive => directive.name)
  ));

  fragment.append(createSectionHeading(
    "Compiler output",
    "Development metadata only; production output omits it by default."
  ));
  if (!visible.length) {
    fragment.append(createEmptyState(
      "No compiled VeloDom templates are available yet. Open a page, then refresh."
    ));
    return fragment;
  }

  visible.forEach(record => {
    const details = createElement("details", "vd-details") as HTMLDetailsElement;
    const summary = document.createElement("summary");
    const actions = createElement("div", "vd-command-row");

    summary.textContent = record.file;
    actions.append(createCopyButton(`vd explain ${JSON.stringify(record.file)}`));
    details.append(summary, actions);

    if (record.directives.length) {
      const heading = createElement("strong", "vd-subheading");
      const list = createElement("ul", "vd-binding-list");
      heading.textContent = "Directive/source inspection";
      record.directives.forEach(directive => {
        const item = document.createElement("li");
        const location = directive.line
          ? ` · ${directive.line}:${directive.column || 1}`
          : "";
        item.textContent = `${directive.name}${directive.argument ? `:${directive.argument}` : ""}${location} — ${directive.expression || "marker"}`;
        list.append(item);
      });
      details.append(heading, list);
    }

    if (record.diagnostics.length) {
      const heading = createElement("strong", "vd-subheading");
      const list = createElement("ul", "vd-binding-list");
      heading.textContent = "Diagnostics";
      record.diagnostics.forEach(diagnostic => {
        const item = document.createElement("li");
        const label = document.createElement("span");
        label.textContent = `${diagnostic.code} · ${diagnostic.line}:${diagnostic.column} — ${diagnostic.message}`;
        item.append(label, createCopyButton(`vd explain ${diagnostic.code}`));
        list.append(item);
      });
      details.append(heading, list);
    }

    details.append(createCodeBlock({ features: record.features }));
    fragment.append(details);
  });
  return fragment;
}

/** Creates a clipboard command without rendering untrusted metadata as HTML. */
function createCopyButton(command: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.copy = command;
  button.textContent = `Copy: ${command}`;
  return button;
}

/** Copies one deterministic local diagnostic command when Clipboard API exists. */
async function copyDiagnosticCommand(button: HTMLButtonElement) {
  const command = button.dataset.copy || "";

  if (!command || !navigator.clipboard?.writeText) {
    button.textContent = "Clipboard unavailable";
    return;
  }

  try {
    await navigator.clipboard.writeText(command);
    button.textContent = "Copied";
  } catch {
    button.textContent = "Copy failed";
  }
}

/** Reads a serialized event field as a display string. */
function readPayloadString(event: DevtoolsEventRecord, key: string) {
  const value = event.payload[key];

  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

/** Reads a finite serialized event number without coercing arbitrary data. */
function readPayloadNumber(event: DevtoolsEventRecord, key: string) {
  const value = event.payload[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Fetches local compiler records and treats an unavailable endpoint as empty. */
async function readCompilerRecords(url: string) {
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { accept: "application/json" }
    });

    if (!response.ok) return [];
    const value = await response.json();

    return Array.isArray(value?.records)
      ? value.records as DevtoolsCompilerRecord[]
      : [];
  } catch {
    return [];
  }
}

/** Creates the static, isolated Lab document structure. */
function createLabStructure() {
  const template = document.createElement("template");

  template.innerHTML = `
    <button class="vd-lab-toggle" type="button" aria-expanded="false">
      <span aria-hidden="true">VD</span>
      <span>Open VeloDom Lab</span>
    </button>
    <aside class="vd-lab" aria-label="VeloDom Lab" hidden>
      <header class="vd-lab-header">
        <div>
          <strong>VeloDom Lab</strong>
          <small class="vd-lab-status" role="status"></small>
        </div>
        <div class="vd-lab-actions">
          <button type="button" data-action="theme">Theme: System</button>
          <button type="button" data-action="refresh" aria-label="Refresh Lab">↻</button>
          <button type="button" data-action="close" aria-label="Close Lab">×</button>
        </div>
      </header>
      <div class="vd-lab-tools">
        <label>
          <span class="vd-sr-only">Search Lab</span>
          <input class="vd-lab-search" type="search" placeholder="Search · Ctrl/Cmd K">
        </label>
        <button type="button" data-action="clear">Clear timeline</button>
      </div>
      <nav class="vd-lab-tabs" role="tablist" aria-label="Lab panels">
        ${TABS.map(tab => (
          `<button type="button" role="tab" data-tab="${tab.id}">${tab.label}</button>`
        )).join("")}
      </nav>
      <section class="vd-lab-content" role="tabpanel" tabindex="0"></section>
      <footer>Local only · no telemetry · read-only inspection</footer>
    </aside>
  `;
  return template.content;
}

/** Creates scoped Lab styles without requiring an application CSS library. */
function createLabStyle() {
  const style = document.createElement("style");

  style.textContent = `
    :host { color-scheme: light dark; font: 13px/1.45 Inter, ui-sans-serif, system-ui, sans-serif; }
    *, *::before, *::after { box-sizing: border-box; }
    button, input { font: inherit; }
    button { cursor: pointer; }
    .vd-lab-toggle { position: fixed; z-index: 2147483646; right: 18px; bottom: 18px; display: flex; align-items: center; gap: 9px; border: 1px solid #4338ca; border-radius: 999px; padding: 9px 14px 9px 9px; color: #fff; background: #312e81; box-shadow: 0 12px 34px #0f172a44; }
    .vd-lab-toggle span:first-child { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; color: #111827; background: #a5f3fc; font-weight: 900; }
    .vd-lab { --bg: #f8fafc; --panel: #fff; --text: #111827; --muted: #64748b; --border: #cbd5e1; --accent: #4f46e5; position: fixed; z-index: 2147483646; right: 14px; bottom: 14px; width: min(680px, calc(100vw - 28px)); height: min(720px, calc(100vh - 28px)); min-width: 340px; min-height: 360px; resize: both; overflow: hidden; border: 1px solid var(--border); border-radius: 14px; color: var(--text); background: var(--bg); box-shadow: 0 22px 70px #0f172a55; }
    .vd-lab[data-theme='dark'] { --bg: #0b1020; --panel: #121a2d; --text: #f8fafc; --muted: #94a3b8; --border: #334155; --accent: #818cf8; color-scheme: dark; }
    .vd-lab[data-theme='light'] { color-scheme: light; }
    @media (prefers-color-scheme: dark) { .vd-lab[data-theme='system'] { --bg: #0b1020; --panel: #121a2d; --text: #f8fafc; --muted: #94a3b8; --border: #334155; --accent: #818cf8; } }
    .vd-lab-header, .vd-lab-tools, .vd-lab-tabs, .vd-lab footer { display: flex; align-items: center; border-bottom: 1px solid var(--border); background: var(--panel); }
    .vd-lab-header { justify-content: space-between; min-height: 58px; padding: 9px 12px 9px 16px; }
    .vd-lab-header strong { display: block; font-size: 15px; }
    .vd-lab-header small { display: block; color: var(--muted); }
    .vd-lab-actions { display: flex; gap: 6px; }
    .vd-lab button { border: 1px solid var(--border); border-radius: 7px; padding: 6px 9px; color: inherit; background: var(--panel); }
    .vd-lab button:hover, .vd-lab button:focus-visible { border-color: var(--accent); outline: 2px solid color-mix(in srgb, var(--accent) 35%, transparent); outline-offset: 1px; }
    .vd-lab-tools { gap: 8px; padding: 8px 12px; }
    .vd-lab-tools label { flex: 1; }
    .vd-lab-search { width: 100%; border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; color: inherit; background: var(--bg); }
    .vd-lab-tabs { gap: 2px; padding: 6px 8px; overflow-x: auto; }
    .vd-lab-tabs button { border-color: transparent; white-space: nowrap; color: var(--muted); }
    .vd-lab-tabs button[data-active='true'] { color: #fff; border-color: var(--accent); background: var(--accent); }
    .vd-lab-content { height: calc(100% - 178px); padding: 16px; overflow: auto; }
    .vd-lab footer { position: absolute; right: 0; bottom: 0; left: 0; min-height: 30px; padding: 5px 12px; color: var(--muted); border-top: 1px solid var(--border); border-bottom: 0; font-size: 11px; }
    .vd-section-heading { margin-bottom: 14px; }
    .vd-section-heading h2 { margin: 0 0 3px; font-size: 16px; }
    .vd-section-heading p { margin: 0; color: var(--muted); }
    .vd-summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
    .vd-metric, .vd-details, .vd-timeline > li, .vd-empty { border: 1px solid var(--border); border-radius: 9px; background: var(--panel); }
    .vd-metric { padding: 12px; }
    .vd-metric small, .vd-scope-meta { display: block; color: var(--muted); }
    .vd-metric strong { display: block; margin-top: 3px; overflow-wrap: anywhere; font-size: 15px; }
    .vd-list, .vd-timeline, .vd-binding-list { margin: 0; padding: 0; list-style: none; }
    .vd-scope + .vd-scope { margin-top: 6px; }
    .vd-scope-button { width: calc(100% - var(--vd-depth, 0) * 16px); margin-left: calc(var(--vd-depth, 0) * 16px); text-align: left; }
    .vd-scope-name { display: block; font-weight: 700; }
    .vd-details { margin-bottom: 9px; overflow: hidden; }
    .vd-details summary { padding: 10px 12px; cursor: pointer; font-weight: 700; }
    pre { max-height: 320px; margin: 0; padding: 12px; overflow: auto; color: #e2e8f0; background: #020617; font: 12px/1.55 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .vd-binding-list { padding: 8px; border-top: 1px solid var(--border); }
    .vd-binding-list li + li { margin-top: 5px; }
    .vd-binding-list button { width: 100%; text-align: left; overflow-wrap: anywhere; }
    .vd-subheading { display: block; padding: 9px 12px 4px; border-top: 1px solid var(--border); }
    .vd-command-row { display: flex; gap: 6px; padding: 8px; border-top: 1px solid var(--border); }
    .vd-command-row button { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .vd-waterfall-track { height: 7px; margin: 0 11px 10px; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, var(--border) 55%, transparent); }
    .vd-waterfall-fill { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
    .vd-timeline > li { margin-bottom: 9px; overflow: hidden; }
    .vd-event-heading { display: flex; justify-content: space-between; gap: 12px; padding: 9px 11px; }
    .vd-event-heading time { color: var(--muted); }
    .vd-empty { padding: 22px; color: var(--muted); text-align: center; }
    .vd-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    @media (max-width: 560px) { .vd-lab { inset: 8px; width: auto; height: auto; min-width: 0; min-height: 0; resize: none; } .vd-lab-actions [data-action='theme'] { display: none; } .vd-summary-grid { grid-template-columns: 1fr; } }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; } }
  `;
  return style;
}

/** Creates one semantic section heading. */
function createSectionHeading(title: string, description: string) {
  const wrapper = createElement("header", "vd-section-heading");
  const heading = document.createElement("h2");
  const paragraph = document.createElement("p");

  heading.textContent = title;
  paragraph.textContent = description;
  wrapper.append(heading, paragraph);
  return wrapper;
}

/** Creates one summary metric. */
function createMetric(label: string, value: string) {
  const item = createElement("div", "vd-metric");
  const small = document.createElement("small");
  const strong = document.createElement("strong");

  small.textContent = label;
  strong.textContent = value;
  item.append(small, strong);
  return item;
}

/** Creates a safe text-only code block. */
function createCodeBlock(value: unknown) {
  const pre = document.createElement("pre");
  const code = document.createElement("code");

  code.textContent = JSON.stringify(value, null, 2);
  pre.append(code);
  return pre;
}

/** Creates a consistent empty-state message. */
function createEmptyState(message: string) {
  const element = createElement("p", "vd-empty");

  element.textContent = message;
  return element;
}

/** Creates an element with one optional class name. */
function createElement(tag: string, className = "") {
  const element = document.createElement(tag);

  if (className) element.className = className;
  return element;
}

/** Returns a required Lab element or fails with an actionable internal error. */
function requireShadowElement<T extends Element>(
  shadow: ShadowRoot,
  selector: string
): T {
  const element = shadow.querySelector<T>(selector);

  if (!element) {
    throw new Error(`VeloDom Lab internal element "${selector}" was not created.`);
  }

  return element;
}

/** Validates the richer bridge contract required by Lab. */
function isLabBridge(value: unknown): value is DevtoolsBridge {
  return Boolean(value)
    && typeof value === "object"
    && typeof (value as DevtoolsBridge).inspect === "function"
    && typeof (value as DevtoolsBridge).subscribe === "function"
    && typeof (value as DevtoolsBridge).highlight === "function";
}

/** Applies the case-insensitive Lab filter to candidate strings. */
function matchesFilter(filter: string, ...values: Array<string | undefined>) {
  return !filter || values.some(value => String(value || "").toLowerCase().includes(filter));
}

/** Reads the persisted open state, defaulting to open for first use. */
function readOpenPreference() {
  try {
    return localStorage.getItem(LAB_OPEN_KEY) !== "false";
  } catch {
    return true;
  }
}

/** Reads the persisted theme with a safe system default. */
function readThemePreference(): LabTheme {
  try {
    const value = localStorage.getItem(LAB_THEME_KEY);

    return value === "dark" || value === "light" ? value : "system";
  } catch {
    return "system";
  }
}

/** Persists one local preference without failing restricted browser contexts. */
function persistPreference(name: string, value: string) {
  try {
    localStorage.setItem(name, value);
  } catch {
    // A restricted localStorage context should not disable the development UI.
  }
}

/** Cycles through the three supported local themes. */
function nextTheme(theme: LabTheme): LabTheme {
  if (theme === "system") return "light";
  if (theme === "light") return "dark";
  return "system";
}

/** Capitalizes a short UI label. */
function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
