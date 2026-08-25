# velodomProj

Small consumer project generated from the published VeloDom starter preset.
It demonstrates the public npm workflow: application code stays in `src/`,
while the framework is installed from the registry as `velodom@1.0.0`.

## Run it

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Project shape

```text
src/main.js                  VeloDom/Vite bootstrap
src/style.css                Light/dark theme and responsive starter styles
src/components/brand-mark/   Reusable logo component
src/pages/home/index.html    HTML-first page template
src/pages/home/script.js     Page state
src/pages/home/config.js     Route and SEO configuration
vite.config.js               VeloDom Vite plugin configuration
```

This project intentionally uses the default folder mode. Add more pages under
`src/pages/<route>/` or opt into a `.vd` single-file page when a feature is
small enough to keep together. The home page also demonstrates a component,
reactive state, an inline SVG logo, a theme toggle, and a framework
introduction without adding a UI dependency.
