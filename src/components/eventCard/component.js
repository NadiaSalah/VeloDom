export function init({ props, state, ctx }) {
  state.title = props.title || "Event Card";
  state.cardKey = props.key || ctx?.key || "";
  state.opened = false;

  function open() {
    state.opened = true;
  }

  function close() {
    state.opened = false;
  }

  function toggle() {
    state.opened = !state.opened;
  }

  function emitPing() {
    ctx?.emit?.("event-card:ping", {
      key: state.cardKey,
      title: state.title,
      opened: state.opened,
      ref: ctx?.ref || ""
    });
  }

  state.open = open;
  state.close = close;
  state.toggle = toggle;
  state.emitPing = emitPing;

  return {
    state,
    expose: {
      open,
      close,
      toggle,
      emitPing
    }
  };
}
