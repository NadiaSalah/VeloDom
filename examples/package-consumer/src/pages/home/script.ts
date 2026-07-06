import type {
  PageScriptContext
} from "velodom";

interface HomeState {
  title: string;
  [key: string]: unknown;
}

export function init({
  state
}: PageScriptContext<HomeState>) {
  state.title = "Installed package works";
}
