export function init({ state, ctx }) {
  state.eventsLog = [];

  ctx?.on?.("event-card:ping", (payload) => {
    const line = `${payload?.title || "card"} | key=${payload?.key || "-"} | ref=${payload?.ref || "-"} | opened=${payload?.opened === true}`;

    state.eventsLog = [line, ...state.eventsLog]
      .slice(0, 10);
  });

  state.openMainGroup = () => {
    state.components.mainCards?.open?.();
  };

  state.toggleMainKey2 = () => {
    state.components.mainCards?.byKey?.["2"]?.toggle?.();
  };

  state.pingMainGroup = () => {
    state.components.mainCards?.emitPing?.();
  };

  state.openSideCard = () => {
    state.components.sideCard?.open?.();
  };

  state.clearLog = () => {
    state.eventsLog = [];
  };
}
