/** Copies public component props into local render state. */
export function init({ props, state }) {
  state.title = props.title || "A reusable component";
  state.text = props.text || "Keep repeated markup in src/components.";
}
