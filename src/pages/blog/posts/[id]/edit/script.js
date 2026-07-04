export function init({ state, ctx }) {
  state.postId = ctx.params.id;
  state.editDraft = {
    title: ""
  };
  state.updatePostResult = null;
  state.updatePostLoading = false;
  state.updatePostError = "";
}
