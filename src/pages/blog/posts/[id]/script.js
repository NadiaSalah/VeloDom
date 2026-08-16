import {
  getOne,
  listArticles
} from "../../../../api/posts.js";

export async function init({ state, ctx }) {
  state.postId = ctx.params.id;
  state.post = null;
  state.relatedPosts = [];
  state.postLoading = true;
  state.postError = "";

  try {
    const [
      post,
      list
    ] = await Promise.all([
      getOne({
        id: state.postId
      }),
      listArticles()
    ]);

    state.post = post;
    state.relatedPosts = list.posts.filter(item => item.id !== post.id).slice(0, 3);
  } catch (error) {
    state.postError = error?.message || "Article could not be loaded";
  } finally {
    state.postLoading = false;
  }
}

export function mounted({ state }) {
  document.title = state.post?.title
    ? `${state.post.title} · VeloDom`
    : "VeloDom article";
}

export function destroy() {
  document.title = "VeloDom";
}
