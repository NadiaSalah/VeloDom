/** Owns the state used by the application-level interactive lessons. */
export const state = {
  bindingActive: false,
  componentDemos: [
    { id: "first", title: "Loop scope: First" },
    { id: "second", title: "Loop scope: Second" }
  ],
  count: 0,
  lessonError: "",
  lessonLoading: false,
  lessonResult: null
};

export function init({ state }) {
  state.toggleBinding = () => {
    state.bindingActive = !state.bindingActive;
  };
  state.increment = () => {
    state.count += 1;
  };
  state.resetCount = () => {
    state.count = 0;
  };
  state.resetComponentDemo = () => {
    state.components.counterDemo?.reset?.();
  };
  state.reorderComponentDemos = () => {
    state.componentDemos = [...state.componentDemos].reverse();
  };
  state.replaceComponentDemos = () => {
    state.componentDemos = [
      { id: "advanced", title: "Loop scope: Updated" }
    ];
  };
}
