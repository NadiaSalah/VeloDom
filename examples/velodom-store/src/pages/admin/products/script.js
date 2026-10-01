/**
 * ----------------------------------------
 * Module: Admin Product List Behavior
 * ----------------------------------------
 *
 * Keeps search/pagination in the URL and coordinates an explicit native-dialog
 * confirmation before a bulk publication request. Confirmed writes invalidate
 * public catalog reads and refetch the private list without remounting its UI.
 * ----------------------------------------
 */

import { invalidateCatalogPages } from "#app/domain/catalog/catalog-freshness.js";

export const state = {
  adminResult: null,
  adminLoading: false,
  adminError: "",
  queryText: "",
  selectedStatus: "all",
  previousHref: "/admin/products",
  nextHref: "/admin/products",
  selectedIds: [],
  bulkAction: "archive",
  bulkResult: null,
  bulkLoading: false,
  bulkError: "",
  selectedCountLabel: "No products selected"
};

export function init({ state, data, ctx }) {
  applyAdminResult(state, data);

  state.toggleProductSelection = (id, checked) => {
    state.selectedIds = checked
      ? [...new Set([...state.selectedIds, id])]
      : state.selectedIds.filter(candidate => candidate !== id);
    updateSelectionLabel(state);
  };
  state.openBulkConfirmation = () => {
    state.bulkError = "";

    if (state.selectedIds.length === 0) {
      state.bulkError = "Select at least one product before opening confirmation.";
      focusAfterRender("#bulk-feedback", ctx.signal);
      return;
    }

    document.querySelector("#bulk-confirm-dialog")?.showModal?.();
  };
  state.closeBulkConfirmation = () => {
    document.querySelector("#bulk-confirm-dialog")?.close?.();
    focusAfterRender("#bulk-action-trigger", ctx.signal);
  };
  state.refreshList = async () => {
    state.adminLoading = true;
    state.adminError = "";
    try {
      const result = await ctx.refetchPageData();
      if (!ctx.signal.aborted) applyAdminResult(state, result, false);
    } catch (error) {
      // A failed read is not a failed write. Keep the last confirmed list visible.
      if (!ctx.signal.aborted) state.adminError = error?.message || "The latest list could not be read.";
    } finally {
      if (!ctx.signal.aborted) state.adminLoading = false;
    }
  };
  state.handleBulkSuccess = async () => {
    invalidateCatalogPages(ctx);
    state.selectedIds = [];
    updateSelectionLabel(state);
    state.closeBulkConfirmation();
    await state.refreshList();
    focusAfterRender(state.adminError ? "#admin-feedback" : "#bulk-success", ctx.signal);
  };

  let previousBulkError = "";
  const unsubscribe = state._subscribe(() => {
    if (state.bulkError && state.bulkError !== previousBulkError) {
      focusAfterRender("#bulk-feedback", ctx.signal);
    }
    previousBulkError = state.bulkError;
  });

  ctx.onCleanup(unsubscribe);
}

function applyAdminResult(state, result, initializeFilters = true) {
  state.adminResult = result;
  if (initializeFilters) {
    state.queryText = result.filters.q;
    state.selectedStatus = result.filters.status;
  }
  state.previousHref = createAdminHref(result.filters, result.filters.page - 1);
  state.nextHref = createAdminHref(result.filters, result.filters.page + 1);
}

function updateSelectionLabel(state) {
  const count = state.selectedIds.length;

  state.selectedCountLabel = count === 0
    ? "No products selected"
    : `${count} product${count === 1 ? "" : "s"} selected`;
}

function createAdminHref(filters, page) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/admin/products?${query}` : "/admin/products";
}

function focusAfterRender(selector, signal) {
  requestAnimationFrame(() => {
    if (!signal.aborted) document.querySelector(selector)?.focus?.();
  });
}
