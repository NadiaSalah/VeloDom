export function init({ state, ctx, refs }) {
  state.count = 0;
  state.visible = true;
  state.accepted = false;
  state.color = "#7c3aed";
  state.profile = {
    name: ""
  };
  state.items = ["HTML-first", "Folder-first", "Compiler-first"];
  state.eventLog = [];
  state.demoResult = null;
  state.demoLoading = false;
  state.demoError = "";

  state.increment = () => {
    state.count += 1;
  };

  state.toggleVisible = () => {
    state.visible = !state.visible;
  };

  state.openModal = () => {
    state.components.featureModal?.open?.();
  };

  state.openCards = () => {
    state.components.featureCards?.open?.();
  };

  state.toggleSecondCard = () => {
    state.components.featureCards?.byKey?.["2"]?.toggle?.();
  };

  state.focusName = () => {
    refs.nameInput?.focus?.();
  };

  ctx.on?.("event-card:ping", payload => {
    state.eventLog = [
      `${payload?.title || "card"} pinged`,
      ...state.eventLog
    ].slice(0, 6);
  });
}

export function mounted({ state, ctx }) {
  state.eventLog = ["features page mounted"];

  ctx.onCleanup(() => {
    console.info("[VeloDom Blog] Features page destroyed");
  });
}
