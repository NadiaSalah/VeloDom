# create-velodom

The official Node-only project scaffolder for the HTML-first VeloDom framework.

```bash
npm create velodom@latest
```

The command offers Minimal, Blog, and Empty starters; JavaScript or TypeScript;
and optional Tailwind, ESLint, Prettier, route examples, localization, testing,
the local read-only VeloDom Lab command, Git initialization, dependency
installation, and dev-server startup.

For automation:

```bash
npm create velodom@latest my-app -- --template minimal --typescript --recommended
```

Pass `--lab` to add `npm run lab`, or `--no-lab` to keep the generated project
at the minimum development surface. Neither choice changes production output.

The implementation delegates to the same scaffolder used by `vd create`, so
the package contains no browser runtime and no duplicate generation logic.

Framework documentation: <https://github.com/NadiaSalah/VeloDom>
