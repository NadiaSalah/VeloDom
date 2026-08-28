/**
 * ----------------------------------------
 * Module: Development Runtime Hook
 * ----------------------------------------
 *
 * Keeps the production-side VeloDom integration deliberately tiny. The full
 * serializer, event recorder, and Lab UI are loaded only when development
 * tooling creates a session.
 * ----------------------------------------
 */

import type {
  DevtoolsRuntimeSession
} from "./protocol.ts";

/** Symbol used to pass an optional session through lifecycle contexts. */
export const DEVTOOLS_CONTEXT = Symbol("VeloDomDevtoolsContext");

const DEVTOOLS_SESSION = Symbol("VeloDomDevtoolsSession");

type InspectableApp = object & {
  [DEVTOOLS_SESSION]?: DevtoolsRuntimeSession;
};

const stateSessions = new WeakMap<object, DevtoolsRuntimeSession>();

/** Returns the optional development session attached to an application. */
export function getDevtoolsRuntimeSession(
  app: object | null | undefined
): DevtoolsRuntimeSession | null {
  return (app as InspectableApp | null | undefined)?.[DEVTOOLS_SESSION] || null;
}

/** Attaches a development session without exposing it through public state. */
export function attachDevtoolsRuntimeSession(
  app: object,
  session: DevtoolsRuntimeSession
) {
  Object.defineProperty(app, DEVTOOLS_SESSION, {
    configurable: true,
    value: session
  });
}

/** Removes a development session only when it is still the active session. */
export function detachDevtoolsRuntimeSession(
  app: object,
  session: DevtoolsRuntimeSession
) {
  const inspectableApp = app as InspectableApp;

  if (inspectableApp[DEVTOOLS_SESSION] === session) {
    Reflect.deleteProperty(inspectableApp, DEVTOOLS_SESSION);
  }
}

/** Associates mounted reactive state with its optional development session. */
export function connectDevtoolsState(
  state: object,
  session: DevtoolsRuntimeSession
) {
  stateSessions.set(state, session);
}

/** Removes one state association without affecting a newer owner. */
export function disconnectDevtoolsState(
  state: object,
  session: DevtoolsRuntimeSession
) {
  if (stateSessions.get(state) === session) stateSessions.delete(state);
}

/** Returns the development session that owns one mounted reactive state. */
export function getDevtoolsSessionForState(
  state: object | null | undefined
): DevtoolsRuntimeSession | null {
  return state ? stateSessions.get(state) || null : null;
}
