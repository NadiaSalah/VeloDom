/**
 * ----------------------------------------
 * Module: Directive Runtime Contracts
 * ----------------------------------------
 *
 * Defines feature-module contracts and shared DOM helpers used by the lazy
 * directive registry without coupling feature implementations together.
 * ----------------------------------------
 */

/** DOM root accepted by directive discovery. */
export type DirectiveRoot = ParentNode & {
  matches?(selector: string): boolean;
};

/** Reactive state shape required by directive feature modules. */
export type DirectiveState = Record<string, unknown> & {
  _subscribe(callback: () => void): () => void;
  _notify(): void;
};

/** Shared page/component context passed to directive features. */
export interface DirectiveRuntimeContext {
  props: Record<string, unknown>;
  root: Element | DirectiveRoot;
  page: string;
  getPageState: ((pageName: string) => DirectiveState) | null;
  hasPage: ((pageName: string) => boolean) | null;
  navigate: ((path: string) => unknown | Promise<unknown>) | null;
}

/** Options accepted while preparing directives for one DOM subtree. */
export interface DirectiveRuntimeOptions {
  el?: Element;
  props?: Record<string, unknown>;
  page?: string;
  getPageState?: ((pageName: string) => DirectiveState) | null;
  hasPage?: ((pageName: string) => boolean) | null;
  navigate?: ((path: string) => unknown | Promise<unknown>) | null;
  features?: string[];
}

/** Cleanup callback owned by a directive or rendered loop item. */
export type DirectiveCleanup = () => unknown;

/** Complete execution context supplied to one directive feature module. */
export interface DirectiveFeatureRuntime {
  root: DirectiveRoot;
  state: DirectiveState;
  cleanups: DirectiveCleanup[];
  context: DirectiveRuntimeContext;
  applyNested(
    root: DirectiveRoot,
    state: DirectiveState,
    options?: DirectiveRuntimeOptions
  ): DirectiveCleanup;
}

/** Synchronous applicator exported by a lazy directive feature module. */
export type DirectiveFeature = (
  runtime: DirectiveFeatureRuntime
) => void;

/** Visibility state shared between conditionals and dependent features. */
export const conditionalVisibility = new WeakMap<Element, boolean>();

/** Finds elements carrying one normalized runtime directive. */
export function findAll(root: DirectiveRoot, name: string) {
  const selector = `[${name}]`;
  const nodes: Element[] = [];

  if (root.matches?.(selector)) {
    nodes.push(root as Element);
  }

  nodes.push(...root.querySelectorAll(selector));

  return nodes;
}

/** Returns whether an element belongs to an unrendered loop template. */
export function isInsideForTemplate(el: Element, forDirective: string) {
  return Boolean(el.closest(`[${forDirective}]`));
}

/** Returns whether an element is suspended by an inactive conditional. */
export function isConditionallyInactive(el: Element) {
  return (
    conditionalVisibility.get(el) === false
    || hasInactiveConditionalAncestor(el)
  );
}

/** Returns whether an ancestor conditional currently hides an element. */
export function hasInactiveConditionalAncestor(el: Element) {
  let parent = el.parentElement;

  while (parent) {
    if (conditionalVisibility.get(parent) === false) {
      return true;
    }

    parent = parent.parentElement;
  }

  return false;
}
