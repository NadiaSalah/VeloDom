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

  const viewportAnchor = () => window.innerHeight * 0.25;
  const viewportSection = () => {
    const anchor = viewportAnchor();
    const current = sections
      .filter(item => {
        const bounds = item.section.getBoundingClientRect();

        return bounds.top <= anchor && bounds.bottom > anchor;
      })
      .at(-1);

    if (current) return current;

    return sections
      .map(item => ({
        item,
        distance: Math.abs(item.section.getBoundingClientRect().top - anchor)
      }))
      .sort((left, right) => left.distance - right.distance)[0]
      ?.item;
  };

  const syncViewportSection = () => {
    const current = viewportSection();

    if (!current) return;

    if (pendingSection && current.id !== pendingSection) return;

    pendingSection = null;
    activeSection(current.id);
  };

  let scrollFrame = 0;
  const onScroll = () => {
    window.cancelAnimationFrame?.(scrollFrame);
    scrollFrame = window.requestAnimationFrame
      ? window.requestAnimationFrame(syncViewportSection)
      : 0;

    if (!window.requestAnimationFrame) syncViewportSection();
  };

  window.addEventListener("scroll", onScroll, { passive: true });

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(syncViewportSection, {
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
    window.cancelAnimationFrame?.(scrollFrame);
    observer?.disconnect();
    links.forEach(link => link.removeEventListener("click", onLinkClick));
    window.removeEventListener("hashchange", onLocationChange);
    window.removeEventListener("popstate", onLocationChange);
    window.removeEventListener("scroll", onScroll);
  });
}

function decodeHash(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
