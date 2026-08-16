# VeloDom Progressive Forms

Status: approved V2 design. This is a contract for optional enhancement, not a
new V1 request directive or backend service.

## HTML-First Rule

A normal form must remain useful without JavaScript:

```html
<form action="/contact" method="post">
  <label>Email <input name="email" type="email" required></label>
  <button>Send</button>
</form>
```

VeloDom may later enhance an explicitly opted-in form after native browser
validation succeeds. The enhancement serializes `FormData`, renders returned
field errors accessibly, and follows redirect responses. If JavaScript fails
or is disabled, the browser still submits the form normally.

## Adapter Boundary

The future adapter contract, not Core, owns mapping a native request to a
server or edge runtime; response shapes, redirects, cookies, and CSRF; and
server-side authorization and validation. An application may define its own
server action format. VeloDom Core must not invent a database, authentication
system, or proprietary server protocol.

## Test Gate

Before enhancement ships, fixtures must verify unchanged native `action` and
`method` behavior, invalid native constraints, successful enhanced submission,
field-error focus, redirects, aborted navigation, and equivalent
no-JavaScript submission.
