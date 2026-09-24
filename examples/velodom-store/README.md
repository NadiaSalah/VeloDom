# VeloDom Store reference consumer

This is a separate, application-owned VeloDom example for catalog, cart, and
mock checkout workflows. It proves that the framework can support a practical
storefront without adding commerce directives, a global store requirement, or
backend policy to Core.

Nothing in this example creates a real order or payment. Product records,
stock, prices, quotations, and the checkout response are deterministic local
fixtures. A production application must replace `src/domain/catalog` with an
authorized backend and retain server-side price, stock, tax, session, and
payment verification.

## What it demonstrates

- folder pages, a `.vd` component, a shared layout, and public package imports;
- URL-backed search, category filtering, sorting, and pagination;
- direct `/products/:id` routes with generated static SEO entries;
- components inside keyed loops with dynamic `vd-props`;
- public page-data loading plus declarative request loading/error states;
- an optional `createSharedState()` guest cart registered as a plugin;
- versioned persistence containing only product option ids and quantities;
- fresh mock stock and price validation before cart and checkout changes;
- native `Intl.NumberFormat`, keyboard-operable controls, responsive CSS, and
  an English/Arabic direction toggle using the optional direction plugin;
- a clearly labeled, non-transactional checkout handoff.

## Structure

```text
src/
  api/             stable client request names
  components/      navigation, product cards, and mock-boundary UI
  domain/          application-owned catalog and cart policy
  layouts/         shared storefront shell
  pages/           catalog, product, cart, checkout, and not-found routes
  main.js          optional plugin composition
  style.css        ordinary responsive CSS with logical properties
```

`src/domain` is an explicit application module, not a new VeloDom discovery
folder. VeloDom still discovers only the documented pages, components,
layouts, and API routes.

## Run

From the repository root:

```bash
npm run dev:store
npm run build:store
npm run preview:store
```

The full browser gate builds and exercises this consumer alongside the
documentation blog, including Back/Forward filters, direct product entry,
refresh persistence, blocked persistence, cart quotation, mock checkout,
mobile layout, keyboard activation, and RTL direction.
