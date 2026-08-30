/**
 * ----------------------------------------
 * Module: Thrown Value Inspection
 * ----------------------------------------
 *
 * Reads messages and framework metadata from unknown thrown values without
 * weakening catch variables or assuming every rejection is an Error instance.
 * ----------------------------------------
 */

/** Returns one own/inherited property from an object-like thrown value. */
export function getThrownProperty(
  error: unknown,
  key: PropertyKey
): unknown {
  if (
    (typeof error === "object" && error !== null)
    || typeof error === "function"
  ) {
    return Reflect.get(error, key);
  }

  return undefined;
}

/** Returns a non-empty thrown string property or the supplied fallback. */
export function getThrownString(
  error: unknown,
  key: PropertyKey,
  fallback = ""
): string {
  const value = getThrownProperty(error, key);

  return typeof value === "string" && value
    ? value
    : fallback;
}

/** Returns whether a thrown value carries truthy framework metadata. */
export function hasThrownProperty(
  error: unknown,
  key: PropertyKey
): boolean {
  return Boolean(getThrownProperty(error, key));
}
