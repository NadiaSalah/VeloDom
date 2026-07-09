export function init({ state, ctx }) {
  state.createDraft = {
    title: "",
    body: "",
    tags: "velodom, framework"
  };
  state.editDraft = {
    id: String(ctx.query.id || 1),
    title: "Updated from VeloDom Studio",
    body: "This update was submitted through a declarative VeloDom request."
  };
  state.deleteId = "1";
  state.createResult = null;
  state.createLoading = false;
  state.createError = "";
  state.updateResult = null;
  state.updateLoading = false;
  state.updateError = "";
  state.deleteResult = null;
  state.deleteLoading = false;
  state.deleteError = "";
}
