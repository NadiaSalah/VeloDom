export function init({ state }) {
  state.opened = false;

  function open() {
    state.opened = true;
  }

  function close() {
    state.opened = false;
  }

  return {
    state,
    expose: {
      close,
      open
    }
  };
}
