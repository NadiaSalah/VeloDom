/**
 * ----------------------------------------
 * Module: Object Validation
 * ----------------------------------------
 *
 * Provides framework-wide structural guards for plain configuration and
 * application records while rejecting arrays and class instances.
 * ----------------------------------------
 */

/** Returns whether a value is a plain object with a safe prototype. */
export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  if (!value || Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}
