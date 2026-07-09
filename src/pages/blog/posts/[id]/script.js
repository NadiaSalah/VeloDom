import {
  getComments,
  getOne
} from "../../../../api/posts.js";

export async function init({ state, ctx }) {
  state.postId = ctx.params.id;
  state.post = null;
  state.postLoading = true;
  state.postError = "";
  state.comments = [];
  state.commentsLoading = true;
  state.commentsError = "";
  state.commentDraft = {
    body: ""
  };
  state.newComment = null;
  state.newCommentLoading = false;
  state.newCommentError = "";

  const [postResult, commentsResult] = await Promise.allSettled([
    getOne({
      id: state.postId
    }, {
      signal: ctx.signal
    }),
    getComments({
      id: state.postId
    }, {
      signal: ctx.signal
    })
  ]);

  if (postResult.status === "fulfilled") {
    state.post = postResult.value;
  } else if (postResult.reason?.name !== "AbortError") {
    state.postError = postResult.reason?.message || "Failed to load post";
  }

  if (commentsResult.status === "fulfilled") {
    state.comments = commentsResult.value.comments || [];
  } else if (commentsResult.reason?.name !== "AbortError") {
    state.commentsError = commentsResult.reason?.message || "Failed to load comments";
  }

  state.postLoading = false;
  state.commentsLoading = false;
}

export function mounted({ state }) {
  document.title = state.post?.title
    ? `${state.post.title} · VeloDom Blog`
    : "Post · VeloDom Blog";
}

export function destroy() {
  document.title = "VeloDom";
}
