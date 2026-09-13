/**
 * ----------------------------------------
 * Module: Public Testing Utilities
 * ----------------------------------------
 *
 * Provides small DOM-test helpers for mounting VeloDom pages and components
 * in browser-like test environments without exposing internal runtime modules.
 * ----------------------------------------
 */

import { applyDirectives } from "./directives.ts";
import { mount } from "./mount.ts";
import { createState } from "./reactive.ts";
import { compileTemplate } from "./compiler/index.ts";
import {
  createRouteTable,
  resolveRouteLocation
} from "./router.ts";
import type {
  ReactiveStateMethods
} from "./reactive.ts";
import type {
  CompilerDiagnostic,
  CompilerOptions,
  RuntimeFeatureManifest,
  TemplateCompileResult
} from "./compiler/types.ts";
import type {
  PageConfig,
  RouteLocation,
  StateRecord,
  UnknownRecord
} from "./types.ts";

type TestCleanup = () => unknown | Promise<unknown>;

/** Result returned after a test page or component is mounted. */
export interface TestMountResult<TState extends StateRecord = StateRecord> {
  cleanup(): Promise<void>;
  root: HTMLElement;
  state: TState;
}

/** Options accepted when mounting a standalone page template in tests. */
export interface TestPageMountOptions<TState extends StateRecord = StateRecord> {
  attachToDocument?: boolean;
  features?: string[];
  props?: UnknownRecord;
  rootTag?: keyof HTMLElementTagNameMap;
  state?: TState;
}

/** Component resources accepted by the component test helper. */
export interface TestComponentDefinition {
  html: string;
  manifest?: RuntimeFeatureManifest;
  module?: UnknownRecord;
  style?: string;
}

/** Options accepted when mounting one component host in tests. */
export interface TestComponentMountOptions<TState extends StateRecord = StateRecord> {
  attachToDocument?: boolean;
  hostTag?: keyof HTMLElementTagNameMap;
  parentState?: TState;
  props?: UnknownRecord;
  slotHtml?: string;
}

/** Recorded calls and reset behavior returned by a request test double. */
export interface TestRequestMock<
  TArgs extends unknown[] = unknown[],
  TResult = unknown
> {
  calls: TArgs[];
  handler(...args: TArgs): Promise<TResult>;
  reset(): void;
}

/** Compiles an in-memory fixture through the public VeloDom compiler path. */
export function compileTestFixture(
  html: string,
  options: CompilerOptions = {}
): TemplateCompileResult {
  return compileTemplate(html, {
    filename: options.filename || "test-fixture.html",
    mode: options.mode || "development",
    optimizers: options.optimizers
  });
}

/** Resolves one test URL with the same ranked route matcher used at runtime. */
export function resolveTestRoute(
  path: string,
  pages: string[],
  configs: Record<string, PageConfig> = {}
): RouteLocation {
  return resolveRouteLocation(path, createRouteTable(pages, configs));
}

/** Creates an async request handler that records arguments without network I/O. */
export function createRequestMock<
  TArgs extends unknown[] = unknown[],
  TResult = unknown
>(
  implementation: TResult | ((...args: TArgs) => TResult | Promise<TResult>)
): TestRequestMock<TArgs, TResult> {
  const calls: TArgs[] = [];

  return {
    calls,
    async handler(...args: TArgs) {
      calls.push(args);

      return typeof implementation === "function"
        ? await (implementation as (...values: TArgs) => TResult | Promise<TResult>)(...args)
        : implementation;
    },
    reset() {
      calls.length = 0;
    }
  };
}

/** Dispatches one bubbling test event and returns it for assertion. */
export function dispatchTestEvent(
  target: EventTarget,
  type: string,
  init: EventInit = {}
): Event {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
    ...init
  });

  target.dispatchEvent(event);
  return event;
}

/** Returns the compiler's deterministic accessibility-smoke diagnostics. */
export function inspectAccessibilitySmoke(
  html: string,
  filename = "test-accessibility.html"
): CompilerDiagnostic[] {
  return compileTestFixture(html, { filename }).diagnostics.filter(
    diagnostic => diagnostic.code.startsWith("VD_A11Y_")
  );
}

/**
 * Mounts a page-like HTML template with VeloDom directives in a test DOM.
 *
 * This helper assumes the caller already installed a browser-like DOM such as
 * happy-dom or jsdom; it does not create globals or a router.
 */
export async function mountTestPage<
  TState extends StateRecord = StateRecord
>(
  html: string,
  options: TestPageMountOptions<TState> = {}
): Promise<TestMountResult<TState>> {
  const root = document.createElement(options.rootTag || "main");
  const state = createState(options.state || {} as TState);
  const compiled = compileTestFixture(html, {
    filename: "test-page.html",
    mode: "production"
  });

  root.innerHTML = compiled.html;

  if (options.attachToDocument !== false) {
    document.body.append(root);
  }

  const directiveCleanup = await applyDirectives(root, state, {
    features: options.features || compiled.manifest.features,
    props: options.props
  });

  return createTestResult(
    root,
    state as unknown as TState,
    directiveCleanup
  );
}

/**
 * Mounts one component host with in-memory component resources.
 *
 * The helper compiles the component template when no manifest is supplied so
 * tests exercise the same feature-selection path as build-time resources.
 */
export async function mountTestComponent<
  TState extends StateRecord = StateRecord
>(
  name: string,
  definition: TestComponentDefinition,
  options: TestComponentMountOptions<TState> = {}
): Promise<TestMountResult<TState>> {
  const root = document.createElement(options.hostTag || "section");
  const state = createState({
    ...(options.parentState || {}),
    __vdTestProps: options.props || {}
  });
  const compiled = compileTestFixture(
    definition.html,
    {
      filename: `${name}/index.html`,
      mode: "production"
    }
  );
  const manifest = definition.manifest || compiled.manifest;

  root.innerHTML = `
    <div data-vd-component="${escapeAttribute(name)}" data-vd-props="__vdTestProps">
      ${options.slotHtml || ""}
    </div>
  `;

  if (options.attachToDocument !== false) {
    document.body.append(root);
  }

  const componentCleanup = await mount(
    root,
    state as unknown as StateRecord & ReactiveStateMethods,
    [],
    null,
    {
      html: {
        [name]: async () => compiled.html
      },
      manifests: {
        [name]: async () => manifest
      },
      modules: definition.module
        ? {
          [name]: async () => definition.module || {}
        }
        : {},
      styles: definition.style
        ? {
          [`${name}/style.css`]: async () => definition.style || ""
        }
        : {}
    }
  );

  return createTestResult(
    root,
    state as unknown as TState,
    componentCleanup
  );
}

/** Creates the test result. */
function createTestResult<TState extends StateRecord>(
  root: HTMLElement,
  state: TState,
  cleanup: TestCleanup
): TestMountResult<TState> {
  return {
    root,
    state,
    async cleanup() {
      await cleanup();
      root.remove();
    }
  };
}

/** Escapes the attribute. */
function escapeAttribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("\"", "&quot;");
}
