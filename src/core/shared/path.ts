/**
 * ----------------------------------------
 * Module: Path Utilities
 * ----------------------------------------
 *
 * Normalizes folder conventions and detects protected state segments used by
 * router, adapter, component, and request boundaries.
 * ----------------------------------------
 */

import { VD_PROTECTED_STATE_KEYS } from "../constants.ts";

/** Normalizes a folder path and rejects traversal segments. */
export function normalizeFolderPath(value: unknown): string {
  const path = String(value || "").trim();

  if (!path || path.includes("..")) {
    return "";
  }

  return path
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
}

/** Finds the first protected key referenced by a state path. */
export function findProtectedStatePathKey(value: unknown): string {
  const keys: string[] = String(value || "").match(/[A-Za-z_$][\w$]*/g)
    ?.map(key => key) || [];
  const protectedKeys: readonly string[] = VD_PROTECTED_STATE_KEYS;

  return keys.find(key => (
    key.startsWith("__vd")
    || protectedKeys.includes(key)
  )) || "";
}
