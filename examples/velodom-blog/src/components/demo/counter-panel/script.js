/**
 * Demonstrates component props, local reactive state, and an explicit
 * parent-facing API through `expose`.
 */
export function init({ props, state }) {
  state.title = props.title || "Reusable counter";
  state.count = 0;

  const increment = () => {
    state.count += 1;
  };
  const reset = () => {
    state.count = 0;
  };

  state.increment = increment;

  return {
    state,
    expose: {
      increment,
      reset
    }
  };
}
