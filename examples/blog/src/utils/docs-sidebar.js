/**
 * Synchronizes a documentation table of contents with the current route,
 * active viewport section, and keyboard focus state.
 *
 * The helper is application-owned: VeloDom's router still owns navigation and
 * hash scrolling, while the documentation site owns how its local index looks.
 */
export function mountDocsSidebar(ctx, selector = ".docs-sidebar-link") {
  const links = [...document.querySelectorAll(selector)];
  const sections = links
    .map(link => {
      const href = link.getAttribute("href") || "";
      const id = decodeHash(href.split("#")[1] || "");

      return {
        id,
        link,
        section: document.getElementById(id)
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
    const href = event.currentTarget.getAttribute("href") || "";
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
