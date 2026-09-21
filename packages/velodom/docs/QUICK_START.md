# VeloDom Quick Start

## Recommended Beginner Journey

Complete this path before choosing optional integrations. It deliberately uses
the Minimal starter, Vanilla JavaScript, and ordinary CSS; TypeScript, Tailwind,
folder/`.vd` alternatives, and additional tooling remain available afterward.

### 1. Create the Project

After the first official V1 release makes both packages available:

```bash
npm create velodom@latest my-app -- --template minimal --javascript --css --yes
cd my-app
npm run dev
```

In the interactive flow, choose **Minimal**, then **Customize**, JavaScript, and
Plain CSS to reach the same result. Do not infer npm availability from source
documentation. Before release, a repository checkout uses the local build:

```bash
npm run package:build
node packages/velodom/bin/create-velodom.js my-app --template minimal --javascript --css --yes --no-install
cd my-app
npm install
npm run dev
```

The generator refuses non-empty destinations and composes Minimal, Blog, or
Empty with optional JavaScript/TypeScript, Tailwind, ESLint, Prettier, route
examples, English/Arabic localization, an optional PWA build, testing, Git,
install, and startup. Customize mode can also add the optional local VeloDom Lab command; selecting
No leaves the project unchanged.

### 2. Edit the Home Page

Replace the generated home files with this smallest interactive page. The HTML
stays readable, while behavior remains in the nearby application-owned script.

```html
<!-- src/pages/home/index.html -->
<main>
  <h1>{{ title }}</h1>
  <p aria-live="polite">Count: {{ count }}</p>
  <button type="button" vd-on:click="increment()">
    Add one
  </button>
</main>
```

```js
// src/pages/home/script.js
export const state = {
  title: "My VeloDom site",
  count: 0
};

export function init({ state }) {
  state.increment = () => {
    state.count += 1;
  };
}
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

### 3. Add a Component

Create a conventional folder component. The command writes only files owned by
your application:

```bash
npx vd create component welcome-note
```

Render it from `src/pages/home/index.html`:

```html
<vd-component
  name="welcome-note"
  vd-prop-title="Ready to build"
></vd-component>
```

Edit `src/components/welcome-note/index.html`, `script.js`, and `style.css` as
ordinary application files. No framework-internal import is needed.

### 4. Use Ordinary CSS

Global styles live in `src/style.css`; folder component styles remain scoped to
that component. Add a small global rule and confirm it updates in development:

```css
main {
  width: min(48rem, calc(100% - 2rem));
  margin-inline: auto;
  padding-block: 4rem;
}
```

### 5. Build and Preview

Stop the development server, then verify the same application as optimized
production output:

```bash
npm run build
npm run preview
```

Open the printed local URL, click **Add one**, and confirm the component is
visible. The journey is complete when both development and preview behave the
same way.

## Continue When the First Journey Works

### Add Another Page

For a quick orientation, run `npx vd help`. The interactive help includes the
large VeloDom CLI wordmark; use `--no-logo` in scripts or `--no-color` for plain
terminal output. On narrow terminals the logo becomes a compact title.
Use `npx vd create --help` (or `-h`) to inspect choices without generating files.

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

### Inspect and Extend the Project

```bash
npx vd doctor
npx vd inspect css
npx vd inspect assets
npx vd check
npx vd fix
npx vd routes
npx vd lab --check
```

Add an existing optional first-party feature without recreating the project:

```bash
npx vd add i18n
npx vd add pwa
npx vd add tests --unit
npx vd add lab
```

After adding localization, `npx vd i18n extract` lists statically quoted keys
and `npx vd i18n check` verifies dictionary parity, usage, and locale direction.
The generated page demonstrates named parameters and native plural rules.

The installer checks conflicts before writing and records only its generated
files in `.velodom/features.json`; it never overwrites application-owned work.
PWA setup writes `src/pwa.js|ts` plus visible public icon/offline files and
updates the Vite plugin list. No worker is registered in projects that do not
opt in.

Inspect that ownership with `npx vd features`. Clean managed features can be
removed or regenerated with `npx vd remove <feature>` and
`npx vd upgrade <feature>`. Share only the data-only choices with
`npx vd preset export`; review the JSON before applying it in another project.

If the project selected Lab, use `npm run lab`. Otherwise `npx vd lab` can
temporarily enable it through the existing Vite development command without
changing production output.

The starter uses only public imports:

```js
import { mountVeloDom } from "velodom/vite";
import { velodom } from "velodom/vite-plugin";
```

Optional scriptable alternatives remain available after the beginner path:

```bash
npm create velodom@latest my-blog -- --template blog --typescript --tailwind
```

## Where to Read Next

- `SYNTAX_REFERENCE.md` for supported template and file syntax
- `FEATURE_INVENTORY.md` for exact capability status
- `AI_GUIDE.md` for coding-assistant rules
- `../AI_CONTEXT.md` for a compact framework contract

Repository: <https://github.com/NadiaSalah/VeloDom>
