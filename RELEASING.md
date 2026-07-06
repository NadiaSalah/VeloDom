# VeloDom Release Policy

VeloDom follows Semantic Versioning for the public package entry points:

- `velodom`
- `velodom/compiler`
- `velodom/vite`
- `velodom/vite-plugin`

## Version Rules

While VeloDom is below `1.0.0`:

- patch releases fix bugs without intentionally changing public behavior;
- minor releases may add features or make documented breaking changes;
- every breaking change must be called out in `CHANGELOG.md`.

After `1.0.0`:

- patch releases contain backward-compatible fixes;
- minor releases add backward-compatible features;
- major releases may change public exports, directives, lifecycle contracts, or
  generated application behavior incompatibly.

Internal files that are not reachable through `package.json#exports` are not
public API. Application folders, tests, source configuration, and showcase
assets must never be included in the npm tarball.

## Release Checklist

1. Update `CHANGELOG.md`, `README.md`, `todo.md`, and the package version.
2. Run `npm run package:check`.
3. Run `npm test`.
4. Run `npm run build`.
5. Inspect `npm run pack:check`.
6. Confirm package-name ownership and choose an explicit public license.
7. Remove the `private` publication guard only after the previous checks pass.
8. Publish only when explicitly authorized; local release preparation never
   implies permission to run `npm publish`.
