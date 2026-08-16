# VeloDom Editor Intelligence

VeloDom ships a small compiler-backed language-service layer through
`velodom/compiler`. It supports optional editor integrations without adding a
browser devtools panel or making a particular editor mandatory.

```ts
import {
  analyzeVeloDomDocument,
  getVeloDomDirectiveCompletions
} from "velodom/compiler";

const analysis = analyzeVeloDomDocument({
  filename: "src/pages/about.vd",
  source: editorText
});
```

The analysis returns compiler diagnostics and directive metadata. For `.vd`
files, template offsets and locations are remapped to the original document, so
an editor can underline the correct template line. Completion candidates use
the preferred `vd-*` syntax.

This is an integration foundation, not a mandatory language server or VS Code
extension. A future extension can add hover docs, project navigation, and code
actions while reusing this stable result instead of duplicating compiler logic.
