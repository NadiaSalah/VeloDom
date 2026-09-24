/**
 * ----------------------------------------
 * Module: Admin Product List Behavior
 * ----------------------------------------
 *
 * Keeps search/pagination in the URL and coordinates an explicit native-dialog
 * confirmation before a bulk publication request.
 * ----------------------------------------
 */

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
      focusAfterRender("#bulk-feedback");
      return;
    }

    document.querySelector("#bulk-confirm-dialog")?.showModal?.();
  };
  state.closeBulkConfirmation = () => {
    document.querySelector("#bulk-confirm-dialog")?.close?.();
    focusAfterRender("#bulk-action-trigger");
  };
  state.handleBulkSuccess = ({ result }) => {
    const updatedById = new Map(
      result.products.map(product => [product.id, product])
    );

    state.adminResult = {
      ...state.adminResult,
      items: state.adminResult.items.map(product => (
        updatedById.get(product.id) || product
      ))
    };
    state.selectedIds = [];
    updateSelectionLabel(state);
    state.closeBulkConfirmation();
    focusAfterRender("#bulk-success");
  };

  let previousBulkError = "";
  const unsubscribe = state._subscribe(() => {
    if (state.bulkError && state.bulkError !== previousBulkError) {
      focusAfterRender("#bulk-feedback");
    }
    previousBulkError = state.bulkError;
  });

  ctx.onCleanup(unsubscribe);
}

function applyAdminResult(state, result) {
  state.adminResult = result;
  state.queryText = result.filters.q;
  state.selectedStatus = result.filters.status;
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

function focusAfterRender(selector) {
  requestAnimationFrame(() => {
    document.querySelector(selector)?.focus?.();
  });
}
