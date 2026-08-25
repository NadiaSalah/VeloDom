/** Owns shared theme state and keeps the navbar highlight route-aware. */
export function init({ state }) {
  state.theme = "light";
  state.themeIcon = "☾";
  state.themeLabel = "Dark mode";
  state.toggleTheme = () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    state.themeIcon = state.theme === "dark" ? "☀" : "☾";
    state.themeLabel = state.theme === "dark" ? "Light mode" : "Dark mode";
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem("velodom-theme", state.theme);
  };
}

export function mounted({ ctx, state }) {
  const links = [...document.querySelectorAll(".site-nav-link")];

  const updateActiveLink = () => {
    const currentPath = normalizePath(window.location.pathname);

    links.forEach(link => {
      const targetPath = normalizePath(new URL(link.href, window.location.origin).pathname);
      const active = targetPath === currentPath;

      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  updateActiveLink();
  if (localStorage.getItem("velodom-theme") === "dark") {
    state.toggleTheme();
  }
  window.addEventListener("popstate", updateActiveLink);
  window.addEventListener("hashchange", updateActiveLink);
  ctx.onCleanup(() => {
    window.removeEventListener("popstate", updateActiveLink);
    window.removeEventListener("hashchange", updateActiveLink);
  });
}

function normalizePath(path) {
  const value = String(path || "/").replace(/\/+$/, "");
  return value || "/";
}
