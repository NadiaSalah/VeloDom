/**
 * ----------------------------------------
 * Module: CLI Project Analyzer
 * ----------------------------------------
 *
 * Provides filesystem discovery and route-convention helpers shared by the
 * static CLI commands. This module never imports browser runtime code.
 * ----------------------------------------
 */

import {
  readFile,
  readdir
} from "node:fs/promises";
import {
  dirname,
  extname,
  join,
  relative
} from "node:path";
import type { DiscoveredModule } from "./types.ts";

/** Discovers folder and optional single-file resources under one app folder. */
export async function discoverModules(
  root: string,
  directory: string,
  includeRoutes: boolean
): Promise<DiscoveredModule[]> {
  const folderFiles = await discoverFiles(root, directory, [".html"]);
  const singleFiles = await discoverFiles(root, directory, [".vd"]);
  const folderModules = await Promise.all(folderFiles
    .filter(file => file.endsWith("/index.html"))
    .map(async file => {
      const name = normalizeModuleName(dirname(file).slice(directory.length + 1));

      return {
        kind: "folder" as const,
        name,
        route: includeRoutes
          ? await readRouteOverride(root, dirname(file), name)
          : undefined,
        source: file
      };
    }));
  const singleModules = await Promise.all(singleFiles.map(async file => {
    const name = normalizeModuleName(
      file.slice(directory.length + 1, -extname(file).length)
    );

    return {
      kind: "single-file" as const,
      name,
      route: includeRoutes
        ? await readSingleFileRouteOverride(root, file, name)
        : undefined,
      source: file
    };
  }));

  return [
    ...folderModules,
    ...singleModules
  ].sort((left, right) => left.name.localeCompare(right.name));
}

/** Recursively discovers files with selected extensions under a project path. */
export async function discoverFiles(
  root: string,
  directory: string,
  extensions: string[]
): Promise<string[]> {
  const absolute = join(root, directory);
  const files = await collectFiles(absolute, extensions);

  return files.map(file => toPosix(relative(root, file))).sort();
}

/** Reads optional project text and returns an empty string when absent. */
export async function readOptionalText(file: string): Promise<string> {
  try {
    return await readFile(file, "utf8");
  } catch {
    return "";
  }
}

/** Extracts a statically declared page path from config source. */
export function readStaticPath(source: string): string {
  return source.match(/\bpath\s*:\s*["']([^"']+)["']/)?.[1] || "";
}

/** Derives a route path from a conventional page resource name. */
export function toRoutePath(name: string): string {
  const route = name === "home"
    ? "/"
    : `/${name}`;

  return route.replace(/\[([^\]]+)\]/g, ":$1");
}

/** Normalizes folder separators and empty resource names. */
export function normalizeModuleName(name: string): string {
  return toPosix(name).replace(/^\/+|\/+$/g, "") || "index";
}

/** Normalizes filesystem paths for deterministic CLI output. */
export function toPosix(value: string): string {
  return value.replaceAll("\\", "/");
}

async function readRouteOverride(
  root: string,
  folder: string,
  name: string
) {
  const config = await readOptionalText(join(root, folder, "config.js"))
    || await readOptionalText(join(root, folder, "page.config.js"));

  return readStaticPath(config) || toRoutePath(name);
}

async function readSingleFileRouteOverride(
  root: string,
  file: string,
  name: string
) {
  const source = await readOptionalText(join(root, file));
  const config = source.match(/<config\b[^>]*>([\s\S]*?)<\/config>/i)?.[1]
    || "";

  return readStaticPath(config) || toRoutePath(name);
}

async function collectFiles(
  directory: string,
  extensions: string[]
): Promise<string[]> {
  try {
    const entries = await readdir(directory, {
      withFileTypes: true
    });
    const nested = await Promise.all(entries.map(entry => {
      const absolute = join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectFiles(absolute, extensions);
      }

      return entry.isFile() && extensions.includes(extname(entry.name))
        ? [absolute]
        : [];
    }));

    return nested.flat();
  } catch {
    return [];
  }
}
