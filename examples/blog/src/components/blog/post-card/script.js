export function init({ props, state, ctx }) {
  state.post = props.post || null;
  state.highlighted = false;
  state.summary = state.post?.body
    ? `${state.post.body.slice(0, 140)}…`
    : "A reusable VeloDom article card waiting for data.";

  function toggleHighlight() {
    state.highlighted = !state.highlighted;
  }

  function announce() {
    ctx.emit?.("blog:post-selected", {
      id: state.post?.id,
      title: state.post?.title || ""
    });
  }

  return {
    state,
    expose: {
      announce,
      toggleHighlight
    }
  };
}
