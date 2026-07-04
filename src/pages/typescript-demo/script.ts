import type { PageScriptContext, StateRecord } from "velodom";

interface TypeScriptDemoState extends StateRecord {
  message: string;
  count: number;
  step: number;
  lifecycleMessage: string;
  increment(): void;
}

export function init({
  state,
  ctx
}: PageScriptContext<TypeScriptDemoState>) {
  state.message = "The same VeloDom API, now with editor types";
  state.count = 0;
  state.step = 1;
  state.lifecycleMessage = "init() ran from script.ts";
  state.increment = () => {
    state.count += Number(state.step) || 1;
  };

  ctx.onCleanup(() => {
    state.lifecycleMessage = "cleanup requested";
  });
}

export function mounted({
  state
}: PageScriptContext<TypeScriptDemoState>) {
  state.lifecycleMessage = "mounted() received typed page context";
}
