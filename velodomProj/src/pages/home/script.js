export const state = {
  theme: "light",
  themeIcon: "☾",
  themeLabel: "Dark mode"
};

export function init({ state }) {
  state.toggleTheme = () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    state.themeIcon = state.theme === "dark" ? "☀" : "☾";
    state.themeLabel = state.theme === "dark" ? "Light mode" : "Dark mode";
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem("velodom-theme", state.theme);
  };
}

export function mounted({ state }) {
  const savedTheme = localStorage.getItem("velodom-theme");

  if (savedTheme === "dark") {
    state.toggleTheme();
  }
}
