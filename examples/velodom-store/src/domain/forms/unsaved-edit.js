/**
 * ----------------------------------------
 * Module: Unsaved Product Edit Protection
 * ----------------------------------------
 *
 * Keeps the example's native draft policy outside Core. The existing router
 * guard handles app links and Back; beforeunload is only a browser best effort.
 * ----------------------------------------
 */

let activeEdit = null;

function warnBeforeUnload(event) {
  event.preventDefault();
  event.returnValue = "";
}

/** Registers one mounted edit surface and releases it with its page lifecycle. */
export function protectEditDraft(path) {
  window.removeEventListener("beforeunload", warnBeforeUnload);
  const edit = { path, dirty: false };
  activeEdit = edit;

  return {
    /** Tracks real draft changes, not fixture controls or save progress. */
    setDirty(dirty) {
      if (activeEdit !== edit || edit.dirty === dirty) return;
      edit.dirty = dirty;
      window.removeEventListener("beforeunload", warnBeforeUnload);
      if (dirty) window.addEventListener("beforeunload", warnBeforeUnload);
    },
    /** Prevents a departed page from keeping a native unload prompt alive. */
    release() {
      if (activeEdit !== edit) return;
      window.removeEventListener("beforeunload", warnBeforeUnload);
      activeEdit = null;
    }
  };
}

/** Blocks only a dirty edit's departure; the user explicitly decides to discard. */
export function confirmEditDeparture({ from }) {
  if (!activeEdit?.dirty || from?.path !== activeEdit.path) return true;
  return typeof window.confirm === "function"
    ? window.confirm("You have unsaved product changes. Leave and discard them?")
    : false;
}
