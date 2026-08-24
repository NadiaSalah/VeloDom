# VeloDom Language Tools

This optional VS Code package consumes `velodom/compiler` rather than
reimplementing directive validation. It registers `.vd` files as VeloDom,
reports shared compiler diagnostics, and offers preferred `vd-*` completions.
HTML diagnostics are disabled by default and can be enabled through
`velodom.language.enableHtmlDiagnostics`.

Hovering a preferred directive shows its description. Go to Definition resolves
conventional `<vd-component name="shared/card">` references and static
`vd-nav` links to matching component/page files when they use the normal folder
or `.vd` conventions. Component names and static routes are also suggested
inside `name=""` and `href=""` respectively; disable those suggestions with
`velodom.language.enableConventionalCompletions` if a project uses a different
convention. Configured route overrides and dynamic concrete URLs remain outside
this lightweight editor index.

The extension expects `velodom` to be available as a dependency after public
publication. It is a stable workspace package pending Marketplace publisher
ownership; it remains separate from the framework package and is never a
runtime requirement for VeloDom applications.
