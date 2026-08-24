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

/**
 * Keeps the documentation index synchronized with the current URL and viewport.
 *
 * The router owns hash navigation and scrolling. This page hook only owns the
 * presentation state of its local table of contents, so the feature remains
 * useful without adding navigation behavior to the framework runtime.
 */
export function mounted({ ctx }) {
  const links = [...document.querySelectorAll(".docs-sidebar-link")];
  const sections = links
    .map(link => {
      const href = link.getAttribute("href") || "";
      const hash = href.split("#")[1] || "";

      return {
        id: decodeHash(hash),
        link,
        section: document.getElementById(decodeHash(hash))
      };
    })
    .filter(item => item.id && item.section);

  if (!sections.length) return;

  const activeSection = id => {
    sections.forEach(item => {
      const isActive = item.id === id;
      item.link.classList.toggle("is-active", isActive);

      if (isActive) {
        item.link.setAttribute("aria-current", "location");
      } else {
        item.link.removeAttribute("aria-current");
      }
    });
  };

  const locationSection = () => {
    const hash = decodeHash(window.location.hash.slice(1));
    return sections.some(item => item.id === hash) ? hash : sections[0].id;
  };

  const onLocationChange = () => activeSection(locationSection());
  const onLinkClick = event => {
    const link = event.currentTarget;
    const href = link.getAttribute("href") || "";
    const id = decodeHash(href.split("#")[1] || "");

    if (id) activeSection(id);
  };

  links.forEach(link => link.addEventListener("click", onLinkClick));
  window.addEventListener("hashchange", onLocationChange);
  window.addEventListener("popstate", onLocationChange);

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];

      if (visible?.target.id) activeSection(visible.target.id);
    }, {
      rootMargin: "-20% 0px -65% 0px",
      threshold: [0, 0.25, 0.75, 1]
    })
    : null;

  sections.forEach(item => observer?.observe(item.section));
  onLocationChange();

  ctx.onCleanup(() => {
    observer?.disconnect();
    links.forEach(link => link.removeEventListener("click", onLinkClick));
    window.removeEventListener("hashchange", onLocationChange);
    window.removeEventListener("popstate", onLocationChange);
  });
}

function decodeHash(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
