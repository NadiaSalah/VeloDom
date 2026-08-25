/**
 * Keeps the shared application navigation aligned with the current route.
 * The router still owns navigation; this component only presents its state.
 */
export function mounted({ ctx }) {
  const links = [...document.querySelectorAll(".site-primary-link")];

  if (!links.length) return;

  const setActive = path => {
    links.forEach(link => {
      const target = new URL(link.href, window.location.origin).pathname;
      const isActive = normalizePath(target) === normalizePath(path);

      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const onLocationChange = () => setActive(window.location.pathname);
  const onLinkClick = event => {
    const link = event.currentTarget;
    setActive(new URL(link.href, window.location.origin).pathname);
  };

  links.forEach(link => link.addEventListener("click", onLinkClick));
  window.addEventListener("popstate", onLocationChange);
  window.addEventListener("hashchange", onLocationChange);
  onLocationChange();

  ctx.onCleanup(() => {
    links.forEach(link => link.removeEventListener("click", onLinkClick));
    window.removeEventListener("popstate", onLocationChange);
    window.removeEventListener("hashchange", onLocationChange);
  });
}

function normalizePath(path) {
  const value = String(path || "/").replace(/\/+$/, "");
  return value || "/";
}
