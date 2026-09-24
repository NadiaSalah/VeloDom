# VeloDom Store reference consumer

This is a separate, application-owned VeloDom example for storefront and
administration workflows. It proves that the framework can support catalog,
cart, mock checkout, and accessible CRUD without adding commerce directives, a
data-grid abstraction, a global store requirement, or backend policy to Core.

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
- a separate administration layout with list, detail, and native edit routes;
- URL-backed server-style search/pagination over the shared catalog repository;
- optimistic revision checks whose failed/conflicting writes preserve drafts;
- native validation, visible recovery, focus restoration, and non-color-only
  status labels;
- a keyboard-operable native confirmation dialog for bulk publication actions.

## Structure

```text
src/
  api/             stable client request names
  components/      navigation, product cards, and mock-boundary UI
  domain/          shared catalog repository plus cart/admin policy
  layouts/         separate storefront and administration shells
  pages/           catalog, product, cart, checkout, admin, and not-found routes
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
documentation blog. Storefront coverage includes Back/Forward filters, direct
product entry, refresh/blocked persistence, quotation, mock checkout, mobile,
keyboard activation, and RTL. Administration coverage includes URL search,
failed/conflicting draft preservation, revision reload, successful edit,
focus restoration, and confirmed bulk status changes. Actual session/role
denial remains the next backend-contract milestone rather than a client claim.
