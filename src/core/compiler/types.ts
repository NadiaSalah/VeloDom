export type CompilerMode = "development" | "production";

export interface SourceLocation {
  line: number;
  column: number;
}

export interface CompilerDiagnostic {
  severity: "error" | "warning";
  code: string;
  message: string;
  filename: string;
  offset: number;
  location: SourceLocation;
}

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

export interface RuntimeFeatureManifest {
  directives: string[];
  features: string[];
}

export interface TemplateAst {
  type: "Template";
  filename: string;
  children: Array<Record<string, unknown>>;
}

export interface TemplateCompileResult {
  html: string;
  ast: TemplateAst;
  metadata: DirectiveMetadata[];
  diagnostics: CompilerDiagnostic[];
  manifest: RuntimeFeatureManifest;
}

export interface TemplateOptimizerContext {
  filename: string;
  mode: CompilerMode;
  source: string;
  addRuntimeFeature(feature: string): void;
}

export interface TemplateOptimizerResult {
  html?: string;
  ast?: TemplateAst;
  metadata?: DirectiveMetadata[];
  diagnostics?: CompilerDiagnostic[];
}

export interface TemplateOptimizer {
  name: string;
  optimize(
    result: Readonly<TemplateCompileResult>,
    context: TemplateOptimizerContext
  ): void | TemplateOptimizerResult;
}

export interface CompilerOptions {
  filename?: string;
  mode?: CompilerMode;
  optimizers?: TemplateOptimizer[];
}
