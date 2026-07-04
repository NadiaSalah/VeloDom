export function init({ state }) {
  state.draft = {
    title: "",
    body: "",
    tags: ""
  };
  state.createPostResult = null;
  state.createPostLoading = false;
  state.createPostError = "";
}
