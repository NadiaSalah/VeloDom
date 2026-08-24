# VeloDom Progressive Forms

Status: V1.1 implementation. This is an optional browser enhancement, not a
new backend service or a replacement for normal HTML form submission.

## HTML-First Rule

A normal form must remain useful without JavaScript:

```html
<form action="/contact" method="post">
  <label>Email <input name="email" type="email" required></label>
  <button>Send</button>
</form>
```

VeloDom enhances an explicitly opted-in `vd-form` only after native browser
validation succeeds. The enhancement preserves `FormData`, renders returned
field errors accessibly, and follows redirect responses. If JavaScript fails,
is disabled, or the plugin is not installed, the browser still submits the
form normally.

```js
import { createProgressiveFormsPlugin } from "velodom";

createApp({
  adapter,
  plugins: [createProgressiveFormsPlugin()]
});
```

```html
<form vd-form action="/contact" method="post">
  <label>Email <input name="email" type="email" required></label>
  <input type="hidden" name="csrf" value="application-token">
  <small vd-form-error="email"></small>
  <button>Send</button>
  <p vd-form-status aria-live="polite"></p>
</form>
```

The plugin supports native GET and POST forms. It adds `data-vd-form-state`,
`data-vd-form-loading`, safe status text, `aria-invalid`, and field-error
markers only while it is active. It consumes JSON `{ message, errors,
redirect }` responses when available and still follows normal HTTP redirects.

## Adapter Boundary

The server or future adapter, not Core, owns request handling, cookies,
server-side authorization, validation, and CSRF policy. Hidden CSRF fields are
preserved automatically; application-owned header schemes can use the plugin
`headers` callback. An application may define its own response shape, while
the small `{ message, errors, redirect }` JSON convention remains optional.
VeloDom Core does not invent a database, authentication system, or proprietary
server protocol.

## Test Gate

The implementation verifies unchanged native `action`/`method` source markup,
native constraint handling, successful enhanced submission, CSRF field
preservation, accessible field errors, redirect delegation, and cleanup aborts.
Real no-JavaScript behavior follows directly from the absence of any required
runtime directive or plugin installation.
