/**
 * ----------------------------------------
 * Module: Explicit Page Data Lifecycle
 * ----------------------------------------
 *
 * Owns app-local page invalidation and refresh coordination over the existing
 * loader/cache. It never remounts pages, performs writes, stores private identity,
 * or replaces application draft/result policy. Router commits stay router-owned.
 * ----------------------------------------
 */

import { createPageDataCache, loadClientPageData } from "./page-data.ts";
import { createLifecycleScope } from "./lifecycle.ts";
import { assertRequestActive, createRequestAbortError } from "./shared/cancellation.ts";
import type { PageDataContext, ResourceLoader, UnknownRecord } from "./types.ts";

type ReadContext = Omit<PageDataContext, "mode">;
type OwnedContext = ReadContext & { signal: AbortSignal };
type RefreshScope = ReturnType<typeof createLifecycleScope>;

interface RefreshRead {
  version: number;
  scope: RefreshScope;
  promise: Promise<unknown>;
}

/** Internal read ownership for one mounted page, shared with its components. */
export interface PageDataOwner {
  /** Re-reads initial data without replacing DOM, drafts or lifecycle hooks. */
  refetch(): Promise<unknown>;
  /** Releases pending refresh and all parent listener ownership. */
  dispose(): void;
}

/** Creates explicit page-read controls without introducing another fetch engine. */
export function createPageDataRuntime(
  loaders: Record<string, ResourceLoader<UnknownRecord>>,
  pages: ReadonlySet<string>
) {
  const cache = createPageDataCache();
  const revisions = new Map<string, number>();
  const owners = new Set<{ page: string; abort(): void; dispose(): void }>();
  let globalRevision = 0;

  /** A monotonic page token also observes clear-all, without retaining route keys. */
  function revision(page: string): number {
    return globalRevision + (revisions.get(page) || 0);
  }

  /** Clears logical-page variants; invalidation alone never reads or updates UI. */
  function invalidate(page?: string): void {
    if (page !== undefined && (typeof page !== "string" || !pages.has(page))) {
      throw new TypeError("invalidatePageData() expects a discovered logical page name, not a URL");
    }
    if (page === undefined) globalRevision++;
    else revisions.set(page, (revisions.get(page) || 0) + 1);
    cache.clear(page);
    for (const owner of owners) {
      if (page === undefined || owner.page === page) owner.abort();
    }
  }

  /** Uses the same conventional loader and opt-in cache as initial navigation. */
  function load(context: ReadContext): Promise<unknown> {
    return loadClientPageData(loaders[context.page], context, cache);
  }

  /** Captures a page lifecycle and app-owned commit; no DOM or state is inferred. */
  function createOwner(context: OwnedContext, commit: (value: unknown) => void): PageDataOwner {
    let read: RefreshRead | null = null;
    let disposed = false;
    const owner = {
      page: context.page,
      abort() { read?.scope.abort(); },
      dispose() {
        if (disposed) return;
        disposed = true;
        owner.abort();
        owners.delete(owner);
        context.signal.removeEventListener("abort", owner.dispose);
      }
    };
    owners.add(owner);
    context.signal.addEventListener("abort", owner.dispose, { once: true });
    if (context.signal.aborted) owner.dispose();

    return {
      dispose: owner.dispose,
      refetch() {
        assertRequestActive(context.signal);
        if (disposed) return Promise.reject(createRequestAbortError());
        if (!loaders[context.page]) return Promise.resolve(undefined);
        if (read && read.version === revision(context.page) && !read.scope.context.signal.aborted) {
          return read.promise;
        }

        // Clear before reading, but only once for concurrent refresh subscribers.
        invalidate(context.page);
        const task: RefreshRead = {
          version: revision(context.page),
          scope: createLifecycleScope({}, context.signal),
          promise: Promise.resolve(undefined)
        };
        read = task;
        task.promise = Promise.resolve().then(() => load({
          ...context, signal: task.scope.context.signal
        })).then(value => {
          assertRequestActive(task.scope.context.signal);
          if (read !== task || task.version !== revision(context.page)) throw createRequestAbortError();
          commit(value);
          return value;
        }).finally(async () => {
          if (read === task) read = null;
          await task.scope.dispose();
        });
        return task.promise;
      }
    };
  }

  return {
    load, revision, invalidate, createOwner,
    /** Releases refresh owners and tracked cache reads during app destruction. */
    dispose() {
      for (const owner of [...owners]) owner.dispose();
      cache.dispose();
    }
  };
}
