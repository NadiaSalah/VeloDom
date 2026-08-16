/**
 * ----------------------------------------
 * Module: CLI Reporters
 * ----------------------------------------
 *
 * Formats human-readable CLI output independently from project discovery and
 * command orchestration. JSON output remains owned by individual commands.
 * ----------------------------------------
 */

import type {
  CliContext,
  DiscoveredModule,
  FileSizeReport
} from "./types.ts";

/** Prints one group of discovered pages, components, or layouts. */
export function printModuleGroup(
  context: CliContext,
  title: string,
  modules: DiscoveredModule[]
): void {
  context.stdout(`${title}: ${modules.length}`);
  modules.forEach(module => {
    const route = module.route ? ` -> ${module.route}` : "";

    context.stdout(`  - ${module.name} (${module.kind})${route}`);
  });
}

/** Prints one titled list using stable CLI indentation. */
export function printList(
  context: CliContext,
  title: string,
  values: string[]
): void {
  context.stdout(`${title}: ${values.length}`);
  values.forEach(value => context.stdout(`  - ${value}`));
}

/** Prints a group of source or generated-file size records. */
export function printSizeGroup(
  context: CliContext,
  title: string,
  values: FileSizeReport[]
): void {
  context.stdout(`${title}:`);
  values.forEach(value => {
    context.stdout(
      `  - ${value.name}: ${formatBytes(value.bytes)} (${value.source})`
    );
  });
}

/** Prints repeated heavy-dependency signals from build intelligence. */
export function printDependencySignals(
  context: CliContext,
  values: Array<{
    chunks: string[];
    name: string;
    totalChunkBytes: number;
  }>
): void {
  context.stdout("Repeated heavy dependencies:");

  if (!values.length) {
    context.stdout("  - none detected from generated chunk text");
    return;
  }

  values.forEach(value => {
    context.stdout(
      `  - ${value.name}: ${formatBytes(value.totalChunkBytes)} across ${value.chunks.length} chunk(s)`
    );
  });
}

/** Formats bytes as compact kibibyte-oriented CLI output. */
export function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} kB`;
}
