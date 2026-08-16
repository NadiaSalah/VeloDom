# VeloDom Language Tools Prototype

This optional VS Code prototype consumes `velodom/compiler` rather than
reimplementing directive validation. It registers `.vd` files as VeloDom,
reports compiler diagnostics, and offers preferred `vd-*` completions. HTML
diagnostics are disabled by default and can be enabled through
`velodom.language.enableHtmlDiagnostics`.

Hovering a preferred directive shows its description. Go to Definition resolves
conventional `<vd-component name="shared/card">` references and static
`vd-nav` links to matching component/page files when they use the normal folder
or `.vd` conventions. Configured route overrides remain outside this prototype.

The extension expects `velodom` to be available as a dependency after public
publication. It is a separate optional package beside the framework package,
not a runtime requirement for VeloDom applications.
