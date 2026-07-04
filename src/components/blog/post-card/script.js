export function init({ props, state, ctx }) {
  state.post = props.post || null;
  state.highlighted = false;

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
