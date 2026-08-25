/** Owns only the state used by the three interactive playground examples. */
export const state = {
  count: 0,
  lessonError: "",
  lessonLoading: false,
  lessonResult: null
};

export function init({ state }) {
  state.increment = () => {
    state.count += 1;
  };
  state.resetCount = () => {
    state.count = 0;
  };
  state.resetComponentDemo = () => {
    state.components.counterDemo?.reset?.();
  };
}
