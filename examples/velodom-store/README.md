# VeloDom Store reference consumer

This is a separate, application-owned VeloDom example for storefront and
administration workflows. It proves that the framework can support catalog,
cart, mock checkout, and accessible CRUD without adding commerce directives, a
data-grid abstraction, a global store requirement, or backend policy to Core.

Nothing in this example creates a real charge or contacts a payment provider.
The local server fixture records only mock orders. Product records, sessions,
stock, prices, tax, quotations, authorization, and order state are deterministic
server-side fixtures. A production application must replace `server/` with its
own authorized backend while retaining the same browser/server boundary.

## What it demonstrates

- folder pages, a `.vd` component, a shared layout, and public package imports;
- URL-backed search, category filtering, sorting, and pagination;
- direct `/products/:id` routes with generated static SEO entries;
- components inside keyed loops with dynamic `vd-props`;
- public page-data loading plus declarative request loading/error states;
- an optional `createSharedState()` guest cart registered as a plugin;
- versioned persistence containing only product option ids and quantities;
- fresh server-side stock, currency, price, and tax validation before cart and
  checkout changes;
- native `Intl.NumberFormat`, keyboard-operable controls, responsive CSS, and
  an English/Arabic direction toggle using the optional direction plugin;
- a clearly labeled, idempotent, non-transactional mock order handoff;
- a separate administration layout with list, detail, and native edit routes;
- URL-backed server-style search/pagination over the shared catalog repository;
- optimistic revision checks whose failed/conflicting writes preserve drafts;
- native validation, visible recovery, focus restoration, and non-color-only
  status labels;
- a keyboard-operable native confirmation dialog for bulk publication actions.
- a replaceable HTTP contract for session, catalog, quote, mock order status,
  and administration writes;
- independent role, owner, tenant, CSRF, expiry, and optimistic-revision denial;
- private `no-store` session/resource responses and abortable pending reads.

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
server/             local-only HTTP authority and Vite/Node adapters
```

`src/domain` is an explicit application module, not a new VeloDom discovery
folder. VeloDom still discovers only the documented pages, components,
layouts, and API routes.

`src/api` is a browser request convention, not a secret execution environment.
It contains only endpoint calls and request shaping. The `server/` fixture owns
the HTTP-only session, authorization, CSRF, authoritative totals, idempotency,
and mock order state. Never put a payment secret or provider SDK credential in
`src/api`, page scripts, or Vite client environment variables.

## Replaceable HTTP contract

| Purpose | Method and fixture route | Policy |
| --- | --- | --- |
| Current session | `GET /__fixture-api/session` | private, no-store |
| Login/logout/expiry | `POST /__fixture-api/session/*` | logout/expiry require CSRF |
| Catalog/product | `GET /__fixture-api/catalog/*` | public short-lived cache |
| Cart quote | `POST /__fixture-api/cart/quote` | server price/currency/stock/tax |
| Create mock order | `POST /__fixture-api/orders` | session + CSRF + idempotency key; never blindly retry |
| Mock order status | `GET /__fixture-api/orders/:id` | owner/tenant authorization |
| Administration | `/__fixture-api/admin/products/*` | admin role + north tenant + CSRF for writes |

Use a fresh idempotency key for each intentional order. A duplicate returns a
conflict so the client can read status instead of repeating a possibly accepted
write. Automatic retry remains appropriate only for explicitly safe reads or a
backend contract designed for it.

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
focus restoration, confirmed bulk status changes, a customer-to-admin guard
redirect, and authenticated HTTP requests. Focused backend-contract tests prove
role/resource/tenant denial, CSRF, expiry/logout/account replacement, private
cache isolation, tamper detection, duplicate-write rejection, and cancellation.
