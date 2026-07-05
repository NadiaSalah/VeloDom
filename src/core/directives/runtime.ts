export type DirectiveRoot = ParentNode & {
  matches?(selector: string): boolean;
};

export type DirectiveState = Record<string, unknown> & {
  _subscribe(callback: () => void): () => void;
};

export interface DirectiveRuntimeContext {
  props: Record<string, unknown>;
  root: Element | DirectiveRoot;
  page: string;
  getPageState: ((pageName: string) => DirectiveState) | null;
  hasPage: ((pageName: string) => boolean) | null;
}

export interface DirectiveRuntimeOptions {
  el?: Element;
  props?: Record<string, unknown>;
  page?: string;
  getPageState?: ((pageName: string) => DirectiveState) | null;
  hasPage?: ((pageName: string) => boolean) | null;
  features?: string[];
}

export type DirectiveCleanup = () => unknown;

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

export type DirectiveFeature = (
  runtime: DirectiveFeatureRuntime
) => void;

export const conditionalVisibility = new WeakMap<Element, boolean>();

export function findAll(root: DirectiveRoot, name: string) {
  const selector = `[${name}]`;
  const nodes: Element[] = [];

  if (root.matches?.(selector)) {
    nodes.push(root as Element);
  }

  nodes.push(...root.querySelectorAll(selector));

  return nodes;
}

export function isInsideForTemplate(el: Element, forDirective: string) {
  return Boolean(el.closest(`[${forDirective}]`));
}

export function isConditionallyInactive(el: Element) {
  return (
    conditionalVisibility.get(el) === false
    || hasInactiveConditionalAncestor(el)
  );
}

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
