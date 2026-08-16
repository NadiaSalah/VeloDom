/**
 * ----------------------------------------
 * Module: Editor Language Service
 * ----------------------------------------
 *
 * Reuses compiler diagnostics and folder-file conventions for editor clients.
 * It is a pure development utility: applications never import it at runtime,
 * and editor integrations can consume its stable document analysis instead of
 * reimplementing VeloDom directive knowledge.
 * ----------------------------------------
 */

import { compileTemplate } from "./compiler/index.ts";
import { parseVeloDomSingleFile } from "./vite-plugin/single-file.ts";
import { PREFERRED_DIRECTIVES } from "./shared/directives.ts";
import type {
  CompilerDiagnostic,
  DirectiveMetadata
} from "./compiler/types.ts";

/** A source document supplied by an editor client or language-server adapter. */
export interface VeloDomLanguageDocument {
  /** Original editor text. */
  source: string;
  /** Filename used by diagnostics and `.vd` detection. */
  filename: string;
}

/** One completion item an editor may present while writing a VeloDom template. */
export interface VeloDomDirectiveCompletion {
  /** Preferred HTML-first directive spelling. */
  label: string;
  /** Brief editor-facing explanation. */
  detail: string;
}

/** Compiler-backed document result intended for optional editor integrations. */
export interface VeloDomLanguageAnalysis {
  /** Normalized template directives available to a future editor client. */
  metadata: DirectiveMetadata[];
  /** Source-aware compiler warnings and errors. */
  diagnostics: CompilerDiagnostic[];
  /** Whether the source was analyzed as a `.vd` single-file template. */
  singleFile: boolean;
}

/**
 * Analyzes HTML or `.vd` source and remaps single-file template diagnostics to
 * the original document. It deliberately does not parse application scripts.
 */
export function analyzeVeloDomDocument(
  document: VeloDomLanguageDocument
): VeloDomLanguageAnalysis {
  const singleFile = document.filename.endsWith(".vd");
  const descriptor = singleFile
    ? parseVeloDomSingleFile(document.source, document.filename)
    : null;
  const template = descriptor?.template || document.source;
  const offset = descriptor?.templateOffset || 0;
  const result = compileTemplate(template, {
    filename: document.filename
  });

  return {
    singleFile,
    metadata: result.metadata.map(entry => mapMetadata(entry, document.source, offset)),
    diagnostics: result.diagnostics.map(diagnostic => (
      mapDiagnostic(diagnostic, document.source, offset)
    ))
  };
}

/**
 * Returns directive completions for editor clients without requiring a browser
 * devtools panel or a framework-specific editor dependency.
 */
export function getVeloDomDirectiveCompletions(): VeloDomDirectiveCompletion[] {
  return [
    ...PREFERRED_DIRECTIVES,
    "bind:*",
    "on:*"
  ].map(name => ({
    label: `vd-${name}`,
    detail: `VeloDom ${name} directive`
  }));
}

function mapDiagnostic(
  diagnostic: CompilerDiagnostic,
  source: string,
  offset: number
): CompilerDiagnostic {
  const originalOffset = diagnostic.offset + offset;

  return {
    ...diagnostic,
    offset: originalOffset,
    location: toLocation(source, originalOffset)
  };
}

function mapMetadata(
  metadata: DirectiveMetadata,
  source: string,
  offset: number
): DirectiveMetadata {
  if (metadata.offset === undefined) return metadata;

  const originalOffset = metadata.offset + offset;

  return {
    ...metadata,
    offset: originalOffset,
    location: toLocation(source, originalOffset)
  };
}

function toLocation(source: string, offset: number) {
  const lines = source.slice(0, offset).split("\n");

  return {
    line: lines.length,
    column: lines.at(-1)?.length || 0
  };
}
