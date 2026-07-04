import {
  getAll as getPosts,
  getTags
} from "../../api/posts.js";

export async function init({ state, ctx }) {
  state.posts ??= [];
  state.tags ??= [];
  state.postsLimit ??= 6;
  state.postsLoading = state.posts.length === 0;
  state.postsError = "";
  state.featuredPost = state.posts[0] || null;
  state.externalPostResult ??= null;
  state.externalPostLoading ??= false;
  state.externalPostError ??= "";

  state.loadMore = async () => {
    state.postsLoading = true;
    state.postsError = "";

    try {
      state.postsLimit += 3;
      state.posts = await getPosts(
        {
          limit: state.postsLimit
        },
        {
          signal: ctx.signal
        }
      );
      state.featuredPost = state.posts[0] || null;
    } catch (error) {
      if (error?.name !== "AbortError") {
        state.postsError = error?.message || "Failed to load posts";
      }
    } finally {
      state.postsLoading = false;
    }
  };

  if (state.posts.length > 0 && state.tags.length > 0) {
    state.postsLoading = false;
    return;
  }

  const [postsResult, tagsResult] = await Promise.allSettled([
    state.posts.length
      ? Promise.resolve(state.posts)
      : getPosts(
        {
          limit: state.postsLimit
        },
        {
          signal: ctx.signal
        }
      ),
    state.tags.length
      ? Promise.resolve(state.tags)
      : getTags({}, {
        signal: ctx.signal
      })
  ]);

  if (postsResult.status === "fulfilled") {
    state.posts = postsResult.value;
    state.featuredPost = state.posts[0] || null;
  } else if (postsResult.reason?.name !== "AbortError") {
    state.postsError = postsResult.reason?.message || "Failed to load posts";
  }

  if (tagsResult.status === "fulfilled") {
    state.tags = tagsResult.value;
  }

  state.postsLoading = false;
}

export function mounted({ ctx }) {
  ctx.onCleanup(() => {
    console.info("[VeloDom Blog] Home page cleaned up");
  });
}
