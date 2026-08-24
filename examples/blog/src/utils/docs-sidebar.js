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

  let pendingSection = null;
  const selectSection = id => {
    pendingSection = id;
    activeSection(id);
  };
  const onLocationChange = () => selectSection(locationSection());
  const onLinkClick = event => {
    const href = event.currentTarget.getAttribute("href") || "";
    const id = decodeHash(href.split("#")[1] || "");

    if (id) selectSection(id);
  };

  links.forEach(link => link.addEventListener("click", onLinkClick));
  window.addEventListener("hashchange", onLocationChange);
  window.addEventListener("popstate", onLocationChange);

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
      if (pendingSection) {
        const pendingEntry = entries.find(entry => (
          entry.isIntersecting && entry.target.id === pendingSection
        ));

        // CSS smooth scrolling may take longer than lifecycle hooks. Keep the
        // URL-selected tab visible until its target actually reaches the
        // observation area, then resume normal scroll-driven selection.
        if (!pendingEntry) return;

        pendingSection = null;
        activeSection(pendingEntry.target.id);
        return;
      }

      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];

      if (visible?.target.id) activeSection(visible.target.id);
    }, {
      rootMargin: "-20% 0px -65% 0px",
      threshold: [0, 0.25, 0.75, 1]
    })
    : null;

  let firstFrame = 0;
  let secondFrame = 0;
  const startObserving = () => {
    sections.forEach(item => observer?.observe(item.section));
    onLocationChange();
  };

  // The router restores a direct hash target after page/component hooks mount.
  // Deferring viewport observation prevents the previous section from briefly
  // replacing the hash-selected tab before that restoration completes.
  onLocationChange();
  if (typeof window.requestAnimationFrame === "function") {
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(startObserving);
    });
  } else {
    startObserving();
  }

  ctx.onCleanup(() => {
    window.cancelAnimationFrame?.(firstFrame);
    window.cancelAnimationFrame?.(secondFrame);
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
