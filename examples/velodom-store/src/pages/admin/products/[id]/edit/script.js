/**
 * ----------------------------------------
 * Module: Admin Product Edit Behavior
 * ----------------------------------------
 *
 * Holds the user's draft independently from request results so validation,
 * transport failure, and optimistic conflicts never erase typed values.
 * ----------------------------------------
 */

export const state = {
  draft: {
    id: "",
    name: "",
    summary: "",
    status: "active",
    revision: 1
  },
  writeMode: "normal",
  dirty: false,
  saveResult: null,
  saveLoading: false,
  saveError: "",
  reloadResult: null,
  reloadLoading: false,
  reloadError: "",
  detailHref: "/admin/products"
};

export function init({ state, data, ctx }) {
  applyServerRecord(state, data);

  state.markDirty = () => {
    state.dirty = true;
    state.saveResult = null;
  };
  state.handleSaveSuccess = ({ result }) => {
    applyServerRecord(state, result.product);
    state.saveResult = result;
    focusAfterRender("#save-status");
  };
  state.handleReloadSuccess = ({ result }) => {
    applyServerRecord(state, result);
    state.saveResult = {
      message: `Reloaded revision ${result.revision}; the previous draft was replaced.`
    };
    state.saveError = "";
    focusAfterRender("#save-status");
  };

  let previousSaveError = "";
  const unsubscribe = state._subscribe(() => {
    if (state.saveError && state.saveError !== previousSaveError) {
      focusAfterRender("#save-error");
    }
    previousSaveError = state.saveError;
  });

  ctx.onCleanup(unsubscribe);
}

function applyServerRecord(state, product) {
  state.draft = {
    id: product.id,
    name: product.name,
    summary: product.summary,
    status: product.status,
    revision: product.revision
  };
  state.detailHref = `/admin/products/${product.id}`;
  state.dirty = false;
  state.writeMode = "normal";
}

function focusAfterRender(selector) {
  requestAnimationFrame(() => {
    document.querySelector(selector)?.focus?.();
  });
}
