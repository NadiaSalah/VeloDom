import { VD_PROTECTED_STATE_KEYS } from "../constants.ts";

export function normalizeFolderPath(value: unknown): string {
  const path = String(value || "").trim();

  if (!path || path.includes("..")) {
    return "";
  }

  return path
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
}

export function findProtectedStatePathKey(value: unknown): string {
  const keys = String(value || "").match(/[A-Za-z_$][\w$]*/g) || [];

  return keys.find(key => (
    key.startsWith("__vd")
    || VD_PROTECTED_STATE_KEYS.includes(key)
  )) || "";
}
