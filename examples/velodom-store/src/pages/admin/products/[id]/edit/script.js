/**
 * ----------------------------------------
 * Module: Admin Product Edit Behavior
 * ----------------------------------------
 *
 * Holds the user's draft independently from request results so validation,
 * transport failure, and optimistic conflicts never erase typed values.
 * ----------------------------------------
 */

import { invalidateCatalogPages } from "#app/domain/catalog/catalog-freshness.js";
import { protectEditDraft } from "#app/domain/forms/unsaved-edit.js";

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
  reloadLoading: false,
  reloadError: "",
  detailHref: "/admin/products"
};

export function init({ state, data, ctx }) {
  applyServerRecord(state, data);
  let savedDraft = { ...state.draft };
  const editProtection = protectEditDraft(ctx.route.path);
  ctx.onCleanup(editProtection.release);

  state.markDirty = () => {
    state.dirty = ["name", "summary", "status"].some(key => (
      state.draft[key] !== savedDraft[key]
    ));
    editProtection.setDirty(state.dirty);
    if (state.dirty) state.saveResult = null;
  };
  state.handleSaveSuccess = ({ result }) => {
    invalidateCatalogPages(ctx);
    applyServerRecord(state, result.product);
    savedDraft = { ...state.draft };
    editProtection.setDirty(false);
    state.saveResult = result;
    focusAfterRender("#save-status", ctx.signal);
  };
  state.reloadRecord = async () => {
    state.reloadLoading = true;
    state.reloadError = "";
    try {
      const result = await ctx.refetchPageData();
      if (ctx.signal.aborted) return;
      // This button explicitly asks to replace the draft, unlike background reads.
      applyServerRecord(state, result);
      savedDraft = { ...state.draft };
      editProtection.setDirty(false);
      state.saveResult = {
        message: `Reloaded revision ${result.revision}; the previous draft was replaced.`
      };
      state.saveError = "";
      focusAfterRender("#save-status", ctx.signal);
    } catch (error) {
      if (!ctx.signal.aborted) state.reloadError = error?.message || "The server version could not be read. Your draft remains available.";
    } finally {
      if (!ctx.signal.aborted) state.reloadLoading = false;
    }
  };

  let previousSaveError = "";
  const unsubscribe = state._subscribe(() => {
    if (state.saveError && state.saveError !== previousSaveError) {
      focusAfterRender("#save-error", ctx.signal);
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

function focusAfterRender(selector, signal) {
  requestAnimationFrame(() => {
    if (!signal.aborted) document.querySelector(selector)?.focus?.();
  });
}
