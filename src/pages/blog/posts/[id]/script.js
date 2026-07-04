import { getOne } from "../../../../api/posts.js";

export async function init({ state, ctx }) {
  state.postId = ctx.params.id;
  state.post = null;
  state.postLoading = true;
  state.postError = "";

  try {
    state.post = await getOne(
      {
        id: state.postId
      },
      {
        signal: ctx.signal
      }
    );
  } catch (error) {
    if (error?.name !== "AbortError") {
      state.postError = error?.message || "Failed to load post";
    }
  } finally {
    state.postLoading = false;
  }
}

export function mounted({ state }) {
  document.title = state.post?.title
    ? `${state.post.title} · VeloDom Blog`
    : "Post · VeloDom Blog";
}

export function destroy() {
  document.title = "VeloDom";
}
