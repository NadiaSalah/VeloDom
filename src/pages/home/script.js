import {
  getAll as getPosts,
  getTags,
  search
} from "../../api/posts.js";

export async function init({ state, ctx }) {
  state.posts = [];
  state.tags = [];
  state.postsLimit = 9;
  state.postsLoading = true;
  state.postsError = "";
  state.featuredPost = null;
  state.query = "";

  state.loadMore = async () => {
    state.postsLimit += 6;
    await loadPosts(state, ctx);
  };

  state.searchPosts = async () => {
    state.postsLoading = true;
    state.postsError = "";

    try {
      const result = await search({
        q: state.query,
        limit: state.postsLimit
      }, {
        signal: ctx.signal
      });

      state.posts = result.posts || [];
      state.featuredPost = state.posts[0] || null;
    } catch (error) {
      if (error?.name !== "AbortError") {
        state.postsError = error?.message || "Failed to search posts";
      }
    } finally {
      state.postsLoading = false;
    }
  };

  const [postsResult, tagsResult] = await Promise.allSettled([
    loadPosts(state, ctx),
    getTags({}, {
      signal: ctx.signal
    })
  ]);

  if (postsResult.status === "rejected" && postsResult.reason?.name !== "AbortError") {
    state.postsError = postsResult.reason?.message || "Failed to load posts";
  }

  if (tagsResult.status === "fulfilled") {
    state.tags = tagsResult.value;
  }
}

async function loadPosts(state, ctx) {
  state.postsLoading = true;
  state.postsError = "";

  try {
    const result = await getPosts({
      limit: state.postsLimit
    }, {
      signal: ctx.signal
    });

    state.posts = result.posts || [];
    state.featuredPost = state.posts[0] || null;
  } finally {
    state.postsLoading = false;
  }
}
