export function init({ props, state }) {
  state.opened = false;
  state.title = props.title || "VeloDom modal";
  state.body = props.body || "The page opened this reusable modal through a component ref and expose().";

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
