/**
 * ----------------------------------------
 * Module: Compiler Contracts
 * ----------------------------------------
 *
 * Defines the stable AST, diagnostic, metadata, manifest, and optimizer
 * contracts shared by the standalone compiler and build integrations.
 * ----------------------------------------
 */

/** Supported compiler output modes. */
export type CompilerMode = "development" | "production";

/** One-based source position used in compiler diagnostics. */
export interface SourceLocation {
  line: number;
  column: number;
}

/** Structured compiler problem with source ownership information. */
export interface CompilerDiagnostic {
  severity: "error" | "warning";
  code: string;
  message: string;
  filename: string;
  offset: number;
  location: SourceLocation;
}

/** Normalized metadata for one compiled directive. */
export interface DirectiveMetadata {
  type: string;
  name: string;
  originalName?: string;
  argument: string;
  modifiers: string[];
  expression: string;
  offset?: number;
  location?: SourceLocation;
}

/** Features and directives required by a compiled template at runtime. */
export interface RuntimeFeatureManifest {
  directives: string[];
  features: string[];
}

/** Minimal template AST retained for optimizer and tooling extensions. */
export interface TemplateAst {
  type: "Template";
  filename: string;
  children: Array<Record<string, unknown>>;
}

/** Complete result returned by the standalone template compiler. */
export interface TemplateCompileResult {
  html: string;
  ast: TemplateAst;
  metadata: DirectiveMetadata[];
  diagnostics: CompilerDiagnostic[];
  manifest: RuntimeFeatureManifest;
}

/** Context supplied to each synchronous template optimizer. */
export interface TemplateOptimizerContext {
  filename: string;
  mode: CompilerMode;
  source: string;
  addRuntimeFeature(feature: string): void;
}

/** Fields an optimizer may replace in a compile result. */
export interface TemplateOptimizerResult {
  html?: string;
  ast?: TemplateAst;
  metadata?: DirectiveMetadata[];
  diagnostics?: CompilerDiagnostic[];
}

/** Named synchronous compiler optimizer contract. */
export interface TemplateOptimizer {
  name: string;
  optimize(
    result: Readonly<TemplateCompileResult>,
    context: TemplateOptimizerContext
  ): void | TemplateOptimizerResult;
}

/** Options accepted by the standalone template compiler. */
export interface CompilerOptions {
  filename?: string;
  mode?: CompilerMode;
  optimizers?: TemplateOptimizer[];
}
