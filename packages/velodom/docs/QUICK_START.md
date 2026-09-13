# VeloDom Quick Start

## 1. Create the Project

After the first official V1 release makes both packages available:

```bash
npm create velodom@latest
cd my-app
npm run dev
```

Choose a starter and Recommended mode for the short path. Do not infer npm
availability from source documentation. Before release, a repository checkout
uses the local build:

```bash
npm run package:build
node packages/velodom/bin/create-velodom.js my-app --no-install
cd my-app
npm install
npm run dev
```

The generator refuses non-empty destinations and composes Minimal, Blog, or
Empty with optional JavaScript/TypeScript, Tailwind, ESLint, Prettier, route
examples, English/Arabic localization, testing, Git, install, and startup.
Customize mode can also add the optional local VeloDom Lab command; selecting
No leaves the project unchanged.

Scriptable example:

```bash
npm create velodom@latest my-blog -- --template blog --typescript --tailwind
```

## 2. Edit the Home Page

```html
<!-- src/pages/home/index.html -->
<main>
  <h1>{{ title }}</h1>
  <p vd-text="message"></p>
  <button type="button" vd-on:click="count++">
    Count: {{ count }}
  </button>
</main>
```

```js
// src/pages/home/script.js
export const state = {
  title: "My VeloDom site",
  message: "Edit ordinary HTML and refresh.",
  count: 0
};
```

```js
// src/pages/home/config.js
export default {
  path: "/",
  seo: {
    title: "Home",
    description: "My first VeloDom page."
  }
};
```

## 3. Add a Page

Use the CLI:

```bash
npx vd create page about
```

Or add the conventional files manually:

```text
src/pages/about/
  index.html
  script.js
  style.css
  config.js
```

For a small page, use:

```bash
npx vd create page about --single-file
```

Then link with app-relative navigation:

```html
<a href="/about" vd-nav>About</a>
```

## 4. Add a Component

```bash
npx vd create component status-badge
```

Use it from a page:

```html
<vd-component
  name="status-badge"
  vd-prop-label="Ready"
></vd-component>
```

## 5. Build and Inspect

```bash
npm run build
npx vd doctor
npx vd check
npx vd fix
npx vd routes
npx vd lab --check
```

Add an existing optional first-party feature without recreating the project:

```bash
npx vd add i18n
npx vd add tests --unit
npx vd add lab
```

The installer checks conflicts before writing and records only its generated
files in `.velodom/features.json`; it never overwrites application-owned work.

If the project selected Lab, use `npm run lab`. Otherwise `npx vd lab` can
temporarily enable it through the existing Vite development command without
changing production output.

The starter uses only public imports:

```js
import { mountVeloDom } from "velodom/vite";
import { velodom } from "velodom/vite-plugin";
```

## Where to Read Next

- `SYNTAX_REFERENCE.md` for supported template and file syntax
- `FEATURE_INVENTORY.md` for exact capability status
- `AI_GUIDE.md` for coding-assistant rules
- `../AI_CONTEXT.md` for a compact framework contract

Repository: <https://github.com/NadiaSalah/VeloDom>
