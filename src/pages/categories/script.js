import {
  getByTag,
  getTags
} from "../../api/posts.js";

export async function init({ state, ctx }) {
  state.tags = [];
  state.posts = [];
  state.activeTag = String(ctx.query.tag || "history");
  state.loading = true;
  state.error = "";

  state.selectTag = async tag => {
    state.activeTag = tag;
    await loadTagPosts(state, ctx);
  };

  try {
    state.tags = await getTags({}, {
      signal: ctx.signal
    });
    await loadTagPosts(state, ctx);
  } catch (error) {
    if (error?.name !== "AbortError") {
      state.error = error?.message || "Failed to load categories";
    }
  } finally {
    state.loading = false;
  }
}

async function loadTagPosts(state, ctx) {
  state.loading = true;
  state.error = "";

  try {
    const result = await getByTag({
      tag: state.activeTag,
      limit: 12
    }, {
      signal: ctx.signal
    });

    state.posts = result.posts || [];
  } catch (error) {
    if (error?.name !== "AbortError") {
      state.error = error?.message || "Failed to load category posts";
    }
  } finally {
    state.loading = false;
  }
}
