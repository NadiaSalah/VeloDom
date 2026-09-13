/**
 * ----------------------------------------
 * Module: Build Metadata
 * ----------------------------------------
 *
 * Creates and reads a compact Rollup bundle description for development-only
 * build intelligence. The artifact contains paths and byte counts, never
 * application source or browser runtime code.
 * ----------------------------------------
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { VD_BUILD } from "./constants.ts";

/** One Rollup module contribution recorded inside an emitted chunk. */
export interface VeloDomBuildModuleMetadata {
  id: string;
  originalBytes: number;
  renderedBytes: number;
}

/** One JavaScript chunk recorded by the VeloDom Vite plugin. */
export interface VeloDomBuildChunkMetadata {
  bytes: number;
  dynamicImports: string[];
  fileName: string;
  imports: string[];
  isDynamicEntry: boolean;
  isEntry: boolean;
  modules: VeloDomBuildModuleMetadata[];
}

/** Versioned build metadata emitted for `vd build-report`. */
export interface VeloDomBuildMetadata {
  chunks: VeloDomBuildChunkMetadata[];
  generator: "velodom/vite-plugin";
  version: number;
}

interface RollupRenderedModuleLike {
  originalLength?: number;
  renderedLength?: number;
}

interface RollupChunkLike {
  code: string;
  dynamicImports: string[];
  fileName: string;
  imports: string[];
  isDynamicEntry?: boolean;
  isEntry: boolean;
  modules: Record<string, RollupRenderedModuleLike>;
  type: "chunk";
}

/**
 * Converts Rollup output into deterministic, machine-independent metadata.
 *
 * @param bundle Rollup's generated output bundle.
 * @param root Vite application root used to remove machine-specific prefixes.
 */
export function createVeloDomBuildMetadata(
  bundle: Record<string, unknown>,
  root: string
): VeloDomBuildMetadata {
  const chunks = Object.values(bundle)
    .filter(isRollupChunk)
    .map(chunk => ({
      bytes: new TextEncoder().encode(chunk.code).byteLength,
      dynamicImports: [...chunk.dynamicImports].sort(),
      fileName: normalizeSlashes(chunk.fileName),
      imports: [...chunk.imports].sort(),
      isDynamicEntry: chunk.isDynamicEntry === true,
      isEntry: chunk.isEntry,
      modules: Object.entries(chunk.modules).map(([id, value]) => ({
        id: normalizeBuildModuleId(id, root),
        originalBytes: normalizeByteCount(value.originalLength),
        renderedBytes: normalizeByteCount(value.renderedLength)
      })).sort((left, right) => left.id.localeCompare(right.id))
    }))
    .sort((left, right) => left.fileName.localeCompare(right.fileName));

  return {
    chunks,
    generator: "velodom/vite-plugin",
    version: VD_BUILD.METADATA_VERSION
  };
}

/** Reads valid VeloDom build metadata from an application dist folder. */
export async function readVeloDomBuildMetadata(
  root: string
): Promise<VeloDomBuildMetadata | null> {
  try {
    const source = await readFile(
      join(root, "dist", VD_BUILD.METADATA_FILE),
      "utf8"
    );
    const value: unknown = JSON.parse(source);

    return isVeloDomBuildMetadata(value) ? value : null;
  } catch {
    return null;
  }
}

/** Narrows a Rollup output record to a JavaScript chunk. */
function isRollupChunk(value: unknown): value is RollupChunkLike {
  if (!value || typeof value !== "object") return false;

  const chunk = value as Partial<RollupChunkLike>;

  return chunk.type === "chunk"
    && typeof chunk.code === "string"
    && typeof chunk.fileName === "string"
    && typeof chunk.isEntry === "boolean"
    && Array.isArray(chunk.imports)
    && Array.isArray(chunk.dynamicImports)
    && Boolean(chunk.modules && typeof chunk.modules === "object");
}

/** Validates the metadata boundary before CLI analysis consumes it. */
function isVeloDomBuildMetadata(value: unknown): value is VeloDomBuildMetadata {
  if (!value || typeof value !== "object") return false;

  const metadata = value as Partial<VeloDomBuildMetadata>;

  return metadata.version === VD_BUILD.METADATA_VERSION
    && metadata.generator === "velodom/vite-plugin"
    && Array.isArray(metadata.chunks)
    && metadata.chunks.every(chunk => (
      typeof chunk?.fileName === "string"
      && typeof chunk.bytes === "number"
      && Array.isArray(chunk.modules)
      && Array.isArray(chunk.imports)
      && Array.isArray(chunk.dynamicImports)
    ));
}

/** Removes local absolute paths while retaining useful project/package names. */
function normalizeBuildModuleId(id: string, root: string) {
  const cleanId = normalizeSlashes(id.replace(/^\0/, "").split("?", 1)[0] || "");
  const cleanRoot = normalizeSlashes(root).replace(/\/$/, "");
  const rootPrefix = `${cleanRoot}/`;

  if (cleanId.startsWith(rootPrefix)) return cleanId.slice(rootPrefix.length);

  const nodeModulesIndex = cleanId.lastIndexOf("/node_modules/");
  if (nodeModulesIndex >= 0) return cleanId.slice(nodeModulesIndex + 1);

  const workspacePackageIndex = cleanId.lastIndexOf("/packages/");
  if (workspacePackageIndex >= 0) return cleanId.slice(workspacePackageIndex + 1);

  if (!/^(?:[A-Za-z]:\/|\/)/.test(cleanId)) return cleanId;

  return `external/${cleanId.split("/").at(-1) || "module"}`;
}

/** Normalizes a byte count from Rollup's rendered-module information. */
function normalizeByteCount(value: number | undefined) {
  return Number.isFinite(value) && (value || 0) > 0
    ? Math.round(value || 0)
    : 0;
}

/** Uses portable separators in emitted metadata. */
function normalizeSlashes(value: string) {
  return value.replaceAll("\\", "/");
}
