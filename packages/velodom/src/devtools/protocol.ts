/**
 * ----------------------------------------
 * Module: Development Tools Protocol
 * ----------------------------------------
 *
 * Defines the versioned, read-only messages exchanged between VeloDom's
 * optional runtime instrumentation and development interfaces.
 * ----------------------------------------
 */

/** Current VeloDom development-tools protocol version. */
export const VELODOM_DEVTOOLS_PROTOCOL_VERSION = 1 as const;

/** Private bootstrap key injected only into Vite development HTML. */
export const VELODOM_LAB_CONFIG_NAME = "__VELODOM_LAB__";

/** Default local-only endpoint for compiler metadata. */
export const VELODOM_LAB_METADATA_PATH = "/__velodom_lab__/metadata";

/** JSON-compatible value produced by the bounded development serializer. */
export type DevtoolsSerializedValue =
  | null
  | boolean
  | number
  | string
  | DevtoolsSerializedValue[]
  | { [key: string]: DevtoolsSerializedValue };

/** Development event kinds currently emitted by framework instrumentation. */
export type DevtoolsEventType =
  | "binding:update"
  | "component:mount"
  | "component:unmount"
  | "dom:update"
  | "event:dispatch"
  | "page:mount"
  | "page:unmount"
  | "request:end"
  | "request:error"
  | "request:start"
  | "route:navigate:end"
  | "route:navigate:error"
  | "route:navigate:start"
  | "state:register"
  | "state:unregister"
  | "state:update";

/** One immutable protocol event retained by the bounded development buffer. */
export interface DevtoolsEventRecord {
  id: number;
  payload: Record<string, DevtoolsSerializedValue>;
  timestamp: number;
  type: DevtoolsEventType;
  version: typeof VELODOM_DEVTOOLS_PROTOCOL_VERSION;
}

/** One directive binding discovered inside a mounted page or component. */
export interface DevtoolsBindingSnapshot {
  directive: string;
  expression: string;
  id: string;
  target: string;
  updates: number;
}

/** Read-only mounted page, component, or shared-state record. */
export interface DevtoolsScopeSnapshot {
  bindings: DevtoolsBindingSnapshot[];
  id: string;
  kind: "component" | "page" | "shared";
  name: string;
  parentId?: string;
  source?: string;
  state: DevtoolsSerializedValue;
  updates: number;
}

/** Route information retained without exposing router implementation objects. */
export interface DevtoolsRouteSnapshot {
  hash: string;
  matched: boolean;
  page: string;
  params: Record<string, string>;
  path: string;
  query: Record<string, string | string[]>;
}

/** Compiler record exposed by the local Vite metadata endpoint. */
export interface DevtoolsCompilerRecord {
  diagnostics: Array<{
    code: string;
    column: number;
    line: number;
    message: string;
    severity: "error" | "warning";
  }>;
  directives: Array<{
    argument: string;
    column?: number;
    expression: string;
    line?: number;
    name: string;
    type: string;
  }>;
  features: string[];
  file: string;
}

/** Options used by the bounded development event session. */
export interface DevtoolsSessionOptions {
  eventLimit?: number;
}

/** Internal interface consumed by router, component, and request adapters. */
export interface DevtoolsRuntimeSession {
  clearEvents(): void;
  destroy(): void;
  emit(
    type: DevtoolsEventType,
    payload?: Record<string, unknown>
  ): DevtoolsEventRecord;
  highlight(id: string): boolean;
  inspect(): {
    events: DevtoolsEventRecord[];
    protocolVersion: typeof VELODOM_DEVTOOLS_PROTOCOL_VERSION;
    route: DevtoolsRouteSnapshot | null;
    scopes: DevtoolsScopeSnapshot[];
    sharedStateNames: string[];
  };
  registerScope(options: {
    kind: DevtoolsScopeSnapshot["kind"];
    name: string;
    parentState?: object | null;
    root?: Element | null;
    source?: string;
    state: object;
  }): () => void;
  setRoute(route: unknown): void;
  subscribe(callback: (event: DevtoolsEventRecord) => void): () => void;
}
