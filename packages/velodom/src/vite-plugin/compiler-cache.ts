/**
 * ----------------------------------------
 * Module: Incremental Compiler Cache
 * ----------------------------------------
 *
 * Caches Vite template-compilation results by normalized source and compiler
 * options, bounds retained entries, and invalidates changed source files.
 * This module is build-time only and never enters the browser runtime.
 * ----------------------------------------
 */

import { createHash } from "node:crypto";
import { VD_COMPILER_CACHE } from "../constants.ts";

/** Inputs that identify one compiler result inside a Vite process. */
export interface CompilerCacheInput {
  source: string;
  sourceFile: string;
  options: unknown;
}

/** Read-only counters used by tests and local cold/warm benchmarks. */
export interface CompilerCacheStats {
  entries: number;
  evictions: number;
  hits: number;
  invalidations: number;
  maxEntries: number;
  misses: number;
}

interface CompilerCacheEntry<TResult> {
  exactSource: string;
  result: TResult;
  sourceFile: string;
}

const referenceIds = new WeakMap<object, number>();
let nextReferenceId = 1;

/** Creates one bounded cache for the lifetime of a Vite plugin instance. */
export function createIncrementalCompilerCache<TResult>(
  maxEntries = VD_COMPILER_CACHE.MAX_ENTRIES
) {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new TypeError("VeloDom compiler cache maxEntries must be a positive integer");
  }

  const entries = new Map<string, CompilerCacheEntry<TResult>>();
  const fileEntries = new Map<string, Set<string>>();
  const fileSources = new Map<string, string>();
  let evictions = 0;
  let hits = 0;
  let invalidations = 0;
  let misses = 0;

  /** Returns a cached value or compiles and records one miss. */
  function getOrCompile(
    input: CompilerCacheInput,
    compile: () => TResult
  ) {
    const sourceFile = normalizeCompilerFilename(input.sourceFile);
    const sourceFingerprint = hashValue(normalizeCompilerSource(input.source));
    const previousSource = fileSources.get(sourceFile);

    if (previousSource !== undefined && previousSource !== sourceFingerprint) {
      invalidate(sourceFile);
    }

    const key = createCompilerCacheKey(
      input.source,
      input.options,
      sourceFile
    );
    const cached = entries.get(key);

    // The exact-source guard preserves diagnostic offsets if equivalent
    // normalized content uses different physical line endings.
    if (cached && cached.exactSource === input.source) {
      hits += 1;
      fileSources.set(sourceFile, sourceFingerprint);
      entries.delete(key);
      entries.set(key, cached);
      return cached.result;
    }

    misses += 1;
    const result = compile();

    removeEntry(key);
    entries.set(key, {
      exactSource: input.source,
      result,
      sourceFile
    });
    addFileEntry(sourceFile, key);
    fileSources.set(sourceFile, sourceFingerprint);
    evictOverflow();
    return result;
  }

  /** Invalidates every compiler variant owned by one changed source file. */
  function invalidate(sourceFile: string) {
    const normalized = normalizeCompilerFilename(sourceFile);
    const keys = fileEntries.get(normalized);

    if (!keys && !fileSources.has(normalized)) return 0;

    let removed = 0;

    for (const key of keys || []) {
      if (removeEntry(key)) removed += 1;
    }

    fileEntries.delete(normalized);
    fileSources.delete(normalized);
    invalidations += 1;
    return removed;
  }

  /** Clears retained results while preserving lifetime statistics. */
  function clear() {
    entries.clear();
    fileEntries.clear();
    fileSources.clear();
  }

  /** Returns an immutable snapshot of cache behavior. */
  function getStats(): CompilerCacheStats {
    return Object.freeze({
      entries: entries.size,
      evictions,
      hits,
      invalidations,
      maxEntries,
      misses
    });
  }

  /** Adds a cache key to its source-file invalidation group. */
  function addFileEntry(sourceFile: string, key: string) {
    const keys = fileEntries.get(sourceFile) || new Set<string>();

    keys.add(key);
    fileEntries.set(sourceFile, keys);
  }

  /** Removes one entry and its reverse source-file reference. */
  function removeEntry(key: string) {
    const entry = entries.get(key);

    if (!entry) return false;

    entries.delete(key);
    const keys = fileEntries.get(entry.sourceFile);

    keys?.delete(key);

    if (keys?.size === 0) {
      fileEntries.delete(entry.sourceFile);
      fileSources.delete(entry.sourceFile);
    }

    return true;
  }

  /** Evicts least-recently-used entries above the configured bound. */
  function evictOverflow() {
    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;

      if (typeof oldestKey !== "string") return;

      removeEntry(oldestKey);
      evictions += 1;
    }
  }

  return Object.freeze({
    clear,
    getOrCompile,
    getStats,
    invalidate
  });
}

/** Creates a stable content/options key without retaining source text. */
export function createCompilerCacheKey(
  source: string,
  options: unknown,
  sourceFile = ""
) {
  return hashValue([
    normalizeCompilerFilename(sourceFile),
    normalizeCompilerSource(source),
    stableSerialize(options)
  ].join("\u0000"));
}

/** Normalizes source only for cache identity, never for compiler input. */
export function normalizeCompilerSource(source: string) {
  return source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n");
}

/** Normalizes Vite file ids for explicit and automatic invalidation. */
function normalizeCompilerFilename(filename: string) {
  return filename
    .split("?", 1)[0]
    .replaceAll("\\", "/");
}

/** Serializes compiler options in stable key order with function identity. */
function stableSerialize(
  value: unknown,
  seen = new Set<object>()
): string {
  if (value === null) return "null";

  const type = typeof value;

  if (type === "string") return JSON.stringify(value);
  if (type === "number" || type === "boolean" || type === "bigint") {
    return `${type}:${String(value)}`;
  }
  if (type === "undefined") return "undefined";
  if (type === "symbol") return `symbol:${String(value)}`;
  if (type === "function") {
    return `function:${getReferenceId(value as object)}`;
  }

  const object = value as Record<string, unknown>;

  if (seen.has(object)) {
    return `circular:${getReferenceId(object)}`;
  }

  seen.add(object);
  const serialized = Array.isArray(object)
    ? `[${object.map(item => stableSerialize(item, seen)).join(",")}]`
    : `{${Object.keys(object).sort().map(key => (
        `${JSON.stringify(key)}:${stableSerialize(object[key], seen)}`
      )).join(",")}}`;

  seen.delete(object);
  return serialized;
}

/** Assigns process-local identity to non-serializable option references. */
function getReferenceId(value: object) {
  const existing = referenceIds.get(value);

  if (existing) return existing;

  const id = nextReferenceId;

  nextReferenceId += 1;
  referenceIds.set(value, id);
  return id;
}

/** Hashes one normalized identity without storing large template keys. */
function hashValue(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}
