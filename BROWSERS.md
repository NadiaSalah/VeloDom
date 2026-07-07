# VeloDom Browser Support

VeloDom targets modern evergreen browsers. The framework is HTML-first and
compiler-first, so browser support focuses on the runtime APIs actually used by
the router, directives, components, lifecycle cleanup, requests, and generated
static SEO pages.

## Supported Browser Matrix

The V1 candidate support policy is:

- latest two stable versions of Chrome
- latest two stable versions of Edge
- latest two stable versions of Firefox
- latest two stable versions of Safari on macOS
- latest two stable versions of iOS Safari
- latest two stable versions of Android Chrome

Unsupported by default:

- Internet Explorer
- legacy EdgeHTML Edge
- Opera Mini
- browsers without native ES modules
- browsers without baseline `Proxy`, `AbortController`, `URL`,
  `URLSearchParams`, `fetch`, `history.pushState`, and DOM event APIs

## Automated Browser Targets

The intended real-browser E2E target set is:

- Chromium/Chrome/Edge: primary routing, directives, components, forms,
  requests, and SEO smoke coverage
- Firefox: routing, form/model behavior, request cancellation, and lifecycle
  cleanup coverage
- WebKit: Safari-class navigation, focus, form, and no-JavaScript SEO coverage
- Mobile Safari/WebKit viewport profile: navigation, touch/click behavior,
  forms, and generated static route HTML

Current local automation:

- `npm run test:browser` builds the showcase and runs a Playwright-powered
  smoke test against a locally installed Chrome or Edge browser.
- The smoke test intercepts demo API traffic, verifies client navigation,
  form/model behavior, request fulfillment, and direct static SEO HTML.

`happy-dom` tests remain useful for fast unit and DOM integration checks, but
they are not considered a replacement for real-browser E2E coverage.

## Minimum E2E Scope Before Public V1

Before public V1, the browser suite should cover:

- direct route loading and client navigation
- dynamic route params and query strings
- navigation guards and 404 behavior
- form `vd-model` behavior
- request success, failure, auth, roles, and cancellation
- component mount/unmount cleanup
- refs, grouped refs, events, and exposed component methods
- generated static SEO HTML with JavaScript disabled
- keyboard focus behavior after navigation once implemented

## Policy Notes

- VeloDom should not add browser polyfills to the core runtime by default.
- Projects that need older browsers should opt into their own build targets and
  polyfills at the application/tooling layer.
- Browser support changes require README, TODO, CHANGELOG, NOTES, and this file
  to stay synchronized.
- Expanding beyond the current Chrome/Edge smoke path to Firefox, WebKit, and
  mobile WebKit remains a separate automation milestone.
