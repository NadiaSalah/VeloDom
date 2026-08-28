/**
 * ----------------------------------------
 * Module: Development Value Serializer
 * ----------------------------------------
 *
 * Converts application-owned values into bounded, non-executable snapshots
 * for local development inspection without invoking getters.
 * ----------------------------------------
 */

import type {
  DevtoolsSerializedValue
} from "./protocol.ts";

/** Limits applied while serializing an inspector value. */
export interface DevtoolsSerializerOptions {
  maxDepth?: number;
  maxEntries?: number;
  maxStringLength?: number;
}

interface SerializerContext {
  maxDepth: number;
  maxEntries: number;
  maxStringLength: number;
  seen: WeakSet<object>;
}

/**
 * Safely serializes an application value for local inspection.
 *
 * Accessors are described but never executed, and recursive or large values
 * are truncated so long-running development sessions remain predictable.
 */
export function serializeDevtoolsValue(
  value: unknown,
  options: DevtoolsSerializerOptions = {}
): DevtoolsSerializedValue {
  const context: SerializerContext = {
    maxDepth: normalizeLimit(options.maxDepth, 5, 1, 20),
    maxEntries: normalizeLimit(options.maxEntries, 100, 1, 1000),
    maxStringLength: normalizeLimit(options.maxStringLength, 1000, 16, 10000),
    seen: new WeakSet()
  };

  return serialize(value, context, 0);
}

/** Serializes one nested value. */
function serialize(
  value: unknown,
  context: SerializerContext,
  depth: number
): DevtoolsSerializedValue {
  if (value === null) return null;
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    return value.length <= context.maxStringLength
      ? value
      : `${value.slice(0, context.maxStringLength)}…`;
  }

  if (typeof value === "number") {
    if (Number.isNaN(value)) return { __vdType: "Number", value: "NaN" };
    if (!Number.isFinite(value)) {
      return { __vdType: "Number", value: String(value) };
    }
    return value;
  }

  if (typeof value === "bigint") {
    return { __vdType: "BigInt", value: value.toString() };
  }

  if (typeof value === "undefined") return { __vdType: "Undefined" };
  if (typeof value === "symbol") {
    return { __vdType: "Symbol", value: value.description || "" };
  }
  if (typeof value === "function") {
    return { __vdType: "Function", name: value.name || "anonymous" };
  }

  if (depth >= context.maxDepth) {
    return { __vdType: "Truncated", reason: "max-depth" };
  }

  const object = value as object;

  if (context.seen.has(object)) {
    return { __vdType: "Circular" };
  }

  context.seen.add(object);

  try {
    if (value instanceof Date) {
      return {
        __vdType: "Date",
        value: Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString()
      };
    }

    if (value instanceof Error) {
      return {
        __vdType: "Error",
        message: value.message,
        name: value.name
      };
    }

    if (typeof Element !== "undefined" && value instanceof Element) {
      return {
        __vdType: "Element",
        value: describeElement(value)
      };
    }

    if (ArrayBuffer.isView(value)) {
      const entries = Array.from(
        value as unknown as ArrayLike<number>
      ).slice(0, context.maxEntries);

      return {
        __vdType: value.constructor.name,
        values: entries.map(entry => serialize(entry, context, depth + 1))
      };
    }

    if (value instanceof Map) {
      return {
        __vdType: "Map",
        entries: [...value.entries()]
          .slice(0, context.maxEntries)
          .map(([key, entry]) => [
            serialize(key, context, depth + 1),
            serialize(entry, context, depth + 1)
          ])
      };
    }

    if (value instanceof Set) {
      return {
        __vdType: "Set",
        values: [...value.values()]
          .slice(0, context.maxEntries)
          .map(entry => serialize(entry, context, depth + 1))
      };
    }

    if (Array.isArray(value)) {
      const result = value
        .slice(0, context.maxEntries)
        .map(entry => serialize(entry, context, depth + 1));

      if (value.length > context.maxEntries) {
        result.push({
          __vdType: "Truncated",
          remaining: value.length - context.maxEntries
        });
      }

      return result;
    }

    return serializeObject(value as Record<PropertyKey, unknown>, context, depth);
  } finally {
    context.seen.delete(object);
  }
}

/** Serializes data properties without executing accessors. */
function serializeObject(
  value: Record<PropertyKey, unknown>,
  context: SerializerContext,
  depth: number
): DevtoolsSerializedValue {
  const result: Record<string, DevtoolsSerializedValue> = {};
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const entries = Reflect.ownKeys(descriptors)
    .filter(key => typeof key === "string" && !String(key).startsWith("_"))
    .slice(0, context.maxEntries);

  entries.forEach(key => {
    const descriptor = descriptors[key];

    result[String(key)] = "value" in descriptor
      ? serialize(descriptor.value, context, depth + 1)
      : { __vdType: "Accessor" };
  });

  const visibleCount = Reflect.ownKeys(descriptors)
    .filter(key => typeof key === "string" && !String(key).startsWith("_"))
    .length;

  if (visibleCount > entries.length) {
    result.__vdTruncated = visibleCount - entries.length;
  }

  return result;
}

/** Describes one DOM element without retaining its markup or private content. */
function describeElement(element: Element) {
  const id = element.id ? `#${element.id}` : "";
  const classes = [...element.classList]
    .slice(0, 3)
    .map(name => `.${name}`)
    .join("");

  return `${element.tagName.toLowerCase()}${id}${classes}`;
}

/** Normalizes one bounded positive integer option. */
function normalizeLimit(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number
) {
  if (value === undefined) return fallback;

  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(
      `VeloDom devtools serializer limits must be integers between ${minimum} and ${maximum}`
    );
  }

  return value;
}
