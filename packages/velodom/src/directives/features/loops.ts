/**
 * ----------------------------------------
 * Module: Loop Directives
 * ----------------------------------------
 *
 * Renders iterable vd-for blocks with local scopes, reconciles stable keyed
 * ownership ranges, mounts component hosts, and disposes removed resources.
 * ----------------------------------------
 */

import { VD } from "../../constants.ts";
import {
  createScope,
  evaluate,
  isIterable,
  updateScopeLocals
} from "../expression.ts";
import { reportUserActionError } from "../../errors/error-reporter.ts";
import {
  findAll,
  isConditionallyInactive
} from "../runtime.ts";
import type {
  DirectiveCleanup,
  DirectiveFeature,
  DirectiveState
} from "../runtime.ts";

type LoopKey = string;

interface RenderedLoopItem {
  start: Comment;
  end: Comment;
  cleanup: DirectiveCleanup;
  componentCleanup: DirectiveCleanup | null;
  item: unknown;
  key: LoopKey | null;
  scope: DirectiveState;
}

interface PreparedLoopItem {
  clone: Element;
  fragment: DocumentFragment;
  rendered: RenderedLoopItem;
}

interface LoopEntry {
  item: unknown;
  index: number;
  key: LoopKey | null;
  attributeKey: string | null;
  validKey: boolean;
}

interface LoopConfig {
  item: string;
  index: string;
  source: string;
}

interface LoopSnapshot {
  source: unknown;
  items: unknown[];
}

/** Applies loop templates using the feature set already loaded by the parent. */
export const applyLoops: DirectiveFeature = ({
  root,
  state,
  cleanups,
  context,
  applyNested,
  mountComponents
}) => {
  const setups = findAll(root, VD.FOR).map(async el => {
    if (el.parentElement?.closest(VD.selector(VD.FOR))) return undefined;

    const expression = el.getAttribute(VD.FOR) || "";
    const config = parseFor(expression);

    if (!config) {
      reportUserActionError(`Invalid ${VD.FOR} expression`, {
        title: "Invalid Loop Expression",
        directive: VD.FOR,
        expression,
        file: "velodom/directives/features/loops.ts",
        line: 38,
        el,
        hint: "Use: item in items OR (item, index) in items"
      });
      return undefined;
    }

    const marker = document.createComment(`vd-for: ${expression}`);
    const template = el.cloneNode(true) as Element;
    const rendered: RenderedLoopItem[] = [];
    let snapshot: LoopSnapshot | null = null;
    let active = true;
    let updateRunning: Promise<void> | null = null;
    let updateRequested = false;
    let initializing = true;
    const keyExpression = template.getAttribute(VD.KEY);

    template.removeAttribute(VD.FOR);
    el.replaceWith(marker);

    const renderItems = (
      items: unknown,
      nextItems: unknown[],
      entries = createLoopEntries(
        nextItems,
        keyExpression,
        state,
        config,
        template,
        context.props
      )
    ): void | Promise<void> => {
      if (!active) return;
      const fragment = document.createDocumentFragment();
      const prepared = entries.map(entry => prepareLoopItem(
        entry,
        state,
        config,
        template
      ));

      prepared.forEach(item => {
        rendered.push(item.rendered);
        fragment.append(item.fragment);
      });

      marker.parentNode?.insertBefore(fragment, marker.nextSibling);

      const pendingMounts = prepared
        .map(item => setupLoopItem(
          item,
          applyNested,
          mountComponents
        ))
        .filter(isPromiseLike);

      const finish = () => {
        snapshot = {
          source: items,
          items: nextItems
        };
      };

      if (pendingMounts.length > 0) {
        return Promise.all(pendingMounts).then(finish);
      }

      finish();
    };

    const reconcileKeyedItems = (
      items: unknown,
      nextItems: unknown[]
    ): void | Promise<void> => {
      const entries = createLoopEntries(
        nextItems,
        keyExpression,
        state,
        config,
        template,
        context.props
      );

      if (!hasUniqueStableKeys(entries)) {
        reportAmbiguousLoopKeys(el, keyExpression || "");
        return replaceRenderedItems(
          items,
          nextItems,
          entries.map(entry => ({
            ...entry,
            key: null
          }))
        );
      }

      const currentByKey = new Map(
        rendered
          .filter(item => item.key !== null)
          .map(item => [item.key as LoopKey, item])
      );
      const reused = new Set<RenderedLoopItem>();
      const planned = entries.map(entry => {
        const current = currentByKey.get(entry.key as LoopKey);

        if (current && Object.is(current.item, entry.item)) {
          updateScopeLocals(current.scope, createLoopLocals(
            entry.item,
            entry.index,
            config
          ));
          reused.add(current);
          return {
            entry,
            current
          };
        }

        return {
          entry,
          current: null
        };
      });
      const removed = rendered.filter(item => !reused.has(item));
      const clearing = disposeRenderedItems(removed);
      const finish = (): void | Promise<void> => {
        if (!active) return;
        const nextRendered: RenderedLoopItem[] = [];
        const pendingMounts: Promise<void>[] = [];
        let cursor: Node = marker;

        planned.forEach(plan => {
          if (plan.current) {
            moveOwnedRangeAfter(plan.current, cursor);
            nextRendered.push(plan.current);
            cursor = plan.current.end;
            return;
          }

          const prepared = prepareLoopItem(
            plan.entry,
            state,
            config,
            template
          );

          cursor.parentNode?.insertBefore(
            prepared.fragment,
            cursor.nextSibling
          );
          nextRendered.push(prepared.rendered);
          cursor = prepared.rendered.end;

          const setup = setupLoopItem(
            prepared,
            applyNested,
            mountComponents
          );

          if (isPromiseLike(setup)) {
            pendingMounts.push(setup);
          }
        });

        rendered.splice(0, rendered.length, ...nextRendered);
        snapshot = {
          source: items,
          items: nextItems
        };

        if (pendingMounts.length > 0) {
          return Promise.all(pendingMounts).then(() => undefined);
        }
      };

      if (isPromiseLike(clearing)) {
        return clearing.then(finish);
      }

      return finish();
    };

    const replaceRenderedItems = (
      items: unknown,
      nextItems: unknown[],
      entries?: LoopEntry[]
    ): void | Promise<void> => {
      const clearing = clearRenderedLoop(rendered);

      if (isPromiseLike(clearing)) {
        return clearing.then(() => renderItems(items, nextItems, entries));
      }

      return renderItems(items, nextItems, entries);
    };

    const update = (): void | Promise<void> => {
      if (!active) return;
      if (isConditionallyInactive(el)) return;

      const items = evaluate(
        config.source,
        state,
        null,
        el,
        context.props,
        {
          directive: VD.FOR
        }
      ) ?? [];

      if (!isIterable(items)) {
        const clearing = clearRenderedLoop(rendered);
        snapshot = null;
        reportUserActionError("Loop source is not iterable", {
          title: "Invalid Loop Source",
          directive: VD.FOR,
          expression: config.source,
          file: "velodom/directives/features/loops.ts",
          line: 72,
          el,
          hint: "Return an array or iterable value from the loop expression."
        });
        return clearing;
      }

      const nextItems = [...items];

      // Keep existing loop nodes when the iterable structure is unchanged.
      // Child directive subscriptions still receive the same state update, so
      // text/class/style changes inside each item remain reactive.
      if (
        keyExpression === null
        && snapshot
        && isSameLoopStructure(snapshot, items, nextItems)
      ) {
        return;
      }

      if (keyExpression !== null) {
        return reconcileKeyedItems(items, nextItems);
      }

      return replaceRenderedItems(items, nextItems);
    };

    const scheduleUpdate = () => {
      if (!active) return;

      if (initializing || updateRunning) {
        updateRequested = true;
        return;
      }

      const result = update();

      if (!isPromiseLike(result)) return;

      updateRunning = result
        .catch(error => {
          if (active) reportLoopUpdateError(error, el, expression);
        })
        .then(() => {
          updateRunning = null;

          if (updateRequested) {
            updateRequested = false;
            scheduleUpdate();
          }
        });
    };

    const unsubscribe = state._subscribe(scheduleUpdate);
    // Register ownership before async nested setup, so abort cannot miss it.
    cleanups.push(() => {
      active = false;
      return clearRenderedLoop(rendered);
    });
    cleanups.push(unsubscribe);

    try {
      await update();
    } catch (error) {
      active = false;
      unsubscribe();
      await clearRenderedLoop(rendered);
      throw error;
    } finally {
      initializing = false;
    }

    if (updateRequested) {
      updateRequested = false;
      scheduleUpdate();
    }

    return undefined;
  });

  if (setups.length > 0) {
    return Promise.all(setups).then(() => undefined);
  }

  return undefined;
};

/** Clears rendered loop ownership ranges after their nested resources dispose. */
function clearRenderedLoop(
  rendered: RenderedLoopItem[]
): void | Promise<void> {
  const result = disposeRenderedItems(rendered);

  rendered.length = 0;
  return result;
}

/** Disposes selected loop items without changing the owner's item array. */
function disposeRenderedItems(
  rendered: RenderedLoopItem[]
): void | Promise<void> {
  const pending: Promise<void>[] = [];

  rendered.forEach(item => {
    const componentResult = item.componentCleanup?.();
    const directiveResult = item.cleanup();

    if (isPromiseLike(componentResult) || isPromiseLike(directiveResult)) {
      pending.push(Promise.all([
        componentResult,
        directiveResult
      ]).then(() => {
        removeOwnedRange(item.start, item.end);
      }));
      return;
    }

    removeOwnedRange(item.start, item.end);
  });

  if (pending.length > 0) {
    return Promise.all(pending).then(() => undefined);
  }
}

/** Creates one detached loop ownership range and its local scope. */
function prepareLoopItem(
  entry: LoopEntry,
  state: DirectiveState,
  config: LoopConfig,
  template: Element
): PreparedLoopItem {
  const clone = template.cloneNode(true) as Element;
  const scope = createScope(
    state,
    createLoopLocals(entry.item, entry.index, config)
  );
  const start = document.createComment(`vd-for-item: ${entry.index}`);
  const end = document.createComment(`/vd-for-item: ${entry.index}`);
  const fragment = document.createDocumentFragment();

  if (entry.attributeKey !== null) {
    clone.setAttribute(VD.KEY, entry.attributeKey);
  }

  fragment.append(start, clone, end);

  return {
    clone,
    fragment,
    rendered: {
      start,
      end,
      cleanup: () => undefined,
      componentCleanup: null,
      item: entry.item,
      key: entry.key,
      scope
    }
  };
}

/** Activates directives and components after an item enters the live DOM. */
function setupLoopItem(
  prepared: PreparedLoopItem,
  applyNested: (
    root: Element,
    state: DirectiveState
  ) => DirectiveCleanup | Promise<DirectiveCleanup>,
  mountComponents: ((
    root: Element,
    state: DirectiveState
  ) => Promise<DirectiveCleanup>) | null
): void | Promise<void> {
  const finish = (
    cleanup: DirectiveCleanup
  ): void | Promise<void> => {
    prepared.rendered.cleanup = cleanup;

    if (!mountComponents || !containsComponentHost(prepared.clone)) {
      return;
    }

    return mountComponents(prepared.clone, prepared.rendered.scope)
      .then(componentCleanup => {
        prepared.rendered.componentCleanup = componentCleanup;
      });
  };
  const nested = applyNested(
    prepared.clone,
    prepared.rendered.scope
  );

  return isPromiseLike(nested)
    ? nested.then(finish)
    : finish(nested);
}

/** Produces local names for a loop item without notifying parent state. */
function createLoopLocals(
  item: unknown,
  index: number,
  config: LoopConfig
) {
  return {
    [config.item]: item,
    [config.index]: index,
    $index: index
  };
}

/** Evaluates stable keys before deciding whether existing ranges are reusable. */
function createLoopEntries(
  items: unknown[],
  keyExpression: string | null,
  state: DirectiveState,
  config: LoopConfig,
  template: Element,
  props: Record<string, unknown>
): LoopEntry[] {
  return items.map((item, index) => {
    if (keyExpression === null) {
      return {
        item,
        index,
        key: null,
        attributeKey: null,
        validKey: false
      };
    }

    const scoped = createScope(
      state,
      createLoopLocals(item, index, config)
    );
    const value = evaluate(
      keyExpression,
      scoped,
      null,
      template,
      props,
      {
        directive: VD.KEY
      }
    );
    const attributeKey = String(value ?? "");
    const validKey = (
      typeof value === "string" && value.length > 0
    ) || (
      typeof value === "number" && Number.isFinite(value)
    );

    return {
      item,
      index,
      key: validKey ? attributeKey : null,
      attributeKey,
      validKey
    };
  });
}

/** Returns whether every entry has a distinct primitive identity. */
function hasUniqueStableKeys(entries: LoopEntry[]) {
  const keys = new Set<LoopKey>();

  return entries.every(entry => {
    if (!entry.validKey || entry.key === null || keys.has(entry.key)) {
      return false;
    }

    keys.add(entry.key);
    return true;
  });
}

/** Moves a complete loop-owned range while preserving every live node. */
function moveOwnedRangeAfter(
  item: RenderedLoopItem,
  cursor: Node
) {
  if (cursor.nextSibling === item.start) return;

  const fragment = document.createDocumentFragment();
  let current: Node | null = item.start;

  while (current) {
    const next: Node | null = current.nextSibling;

    fragment.append(current);

    if (current === item.end) break;

    current = next;
  }

  cursor.parentNode?.insertBefore(fragment, cursor.nextSibling);
}

/** Returns whether a loop item contains a component host to mount. */
function containsComponentHost(root: Element) {
  const selector = [
    VD.selector(VD.COMPONENT),
    VD.COMPONENT_TAG_SELECTOR
  ].join(", ");

  return root.matches(selector) || Boolean(root.querySelector(selector));
}

/** Removes one loop item even when a hostless component replaced its host. */
function removeOwnedRange(start: Comment, end: Comment) {
  let current: Node | null = start;

  while (current) {
    const next: Node | null = current.nextSibling;

    current.parentNode?.removeChild(current);

    if (current === end) return;

    current = next;
  }
}

/** Reports failures raised by an asynchronous loop refresh. */
function reportLoopUpdateError(
  error: unknown,
  el: Element,
  expression: string
) {
  reportUserActionError(error, {
    title: "Loop Update Error",
    directive: VD.FOR,
    expression,
    file: "velodom/directives/features/loops.ts",
    el,
    hint: "Check loop expressions and component lifecycle hooks used by repeated content."
  });
}

/** Explains why one keyed update uses the conservative rebuild path. */
function reportAmbiguousLoopKeys(
  el: Element,
  expression: string
) {
  reportUserActionError("Loop keys must be unique non-empty strings or finite numbers", {
    title: "Ambiguous Loop Keys",
    directive: VD.KEY,
    expression,
    file: "velodom/directives/features/loops.ts",
    el,
    level: "warn",
    hint: "Give every item a stable unique vd-key. VeloDom rebuilt this update safely."
  });
}

/** Returns whether loop setup or cleanup continued asynchronously. */
function isPromiseLike(value: unknown): value is Promise<unknown> {
  return Boolean(
    value
    && typeof (value as Promise<unknown>).then === "function"
  );
}

/** Evaluates the `isSameLoopStructure()` condition for the supplied input. */
function isSameLoopStructure(
  snapshot: LoopSnapshot,
  source: unknown,
  items: unknown[]
) {
  if (snapshot.source === source && snapshot.items.length !== items.length) {
    return false;
  }

  if (snapshot.items.length !== items.length) {
    return false;
  }

  return items.every((item, index) => Object.is(item, snapshot.items[index]));
}

/** Parses the for. */
function parseFor(expression: string): LoopConfig | null {
  const match = expression.match(
    /^\s*(?:\(\s*([\w$]+)\s*,\s*([\w$]+)\s*\)|([\w$]+))\s+in\s+(.+)\s*$/
  );

  const item = match?.[1] || match?.[3];
  const source = match?.[4];

  if (!item || !source) return null;

  return {
    item,
    index: match?.[2] || "$index",
    source
  };
}
