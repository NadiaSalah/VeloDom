export function init({ state }) {
  state.count = 0;
  state.lessonResult = null;
  state.lessonLoading = false;
  state.lessonError = "";

  state.increment = () => {
    state.count += 1;
  };

  state.resetCount = () => {
    state.count = 0;
  };
}
