/**
 * Optional VS Code prototype for VeloDom compiler diagnostics.
 * It depends on the published `velodom/compiler` language-service surface.
 */

const vscode = require("vscode");

function activate(context) {
  const diagnostics = vscode.languages.createDiagnosticCollection("velodom");
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    [{ language: "velodom" }, { language: "html", scheme: "file" }],
    {
      provideCompletionItems(document) {
        if (!shouldAnalyze(document)) return [];
        const compiler = loadCompiler();

        return compiler.getVeloDomDirectiveCompletions().map(item => {
          const completion = new vscode.CompletionItem(
            item.label,
            vscode.CompletionItemKind.Property
          );
          completion.detail = item.detail;
          return completion;
        });
      }
    },
    "-",
    ":"
  );
  const hoverProvider = vscode.languages.registerHoverProvider(
    [{ language: "velodom" }, { language: "html", scheme: "file" }],
    {
      provideHover(document, position) {
        if (!shouldAnalyze(document)) return null;
        const range = document.getWordRangeAtPosition(position, /[\w:-]+/);
        const label = range ? document.getText(range) : "";
        const completion = loadCompiler()
          .getVeloDomDirectiveCompletions()
          .find(item => item.label === label);

        if (!completion) return null;

        return new vscode.Hover(new vscode.MarkdownString(
          `**${completion.label}**  \n${completion.detail}`
        ));
      }
    }
  );
  const definitionProvider = vscode.languages.registerDefinitionProvider(
    [{ language: "velodom" }, { language: "html", scheme: "file" }],
    {
      provideDefinition(document, position) {
        if (!shouldAnalyze(document)) return null;
        return findProjectDefinition(document, position);
      }
    }
  );
  const refresh = document => updateDiagnostics(document, diagnostics);

  context.subscriptions.push(
    diagnostics,
    completionProvider,
    hoverProvider,
    definitionProvider,
    vscode.workspace.onDidOpenTextDocument(refresh),
    vscode.workspace.onDidChangeTextDocument(event => refresh(event.document)),
    vscode.workspace.onDidCloseTextDocument(document => diagnostics.delete(document.uri))
  );
  vscode.workspace.textDocuments.forEach(refresh);
}

function deactivate() {}

function updateDiagnostics(document, collection) {
  if (!shouldAnalyze(document)) {
    collection.delete(document.uri);
    return;
  }

  const compiler = loadCompiler();
  const analysis = compiler.analyzeVeloDomDocument({
    filename: document.fileName,
    source: document.getText()
  });
  const problems = analysis.diagnostics.map(problem => {
    const start = new vscode.Position(
      Math.max(0, problem.location.line - 1),
      Math.max(0, problem.location.column - 1)
    );
    const severity = problem.severity === "error"
      ? vscode.DiagnosticSeverity.Error
      : vscode.DiagnosticSeverity.Warning;
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(start, start.translate(0, 1)),
      `[${problem.code}] ${problem.message}`,
      severity
    );

    diagnostic.source = "VeloDom";
    diagnostic.code = problem.code;
    return diagnostic;
  });

  collection.set(document.uri, problems);
}

function shouldAnalyze(document) {
  return document.languageId === "velodom"
    || (
      document.languageId === "html"
      && vscode.workspace.getConfiguration("velodom.language")
        .get("enableHtmlDiagnostics", false)
    );
}

function loadCompiler() {
  try {
    return require("velodom/compiler");
  } catch (error) {
    throw new Error(
      "VeloDom Language Tools requires the velodom package in the extension environment."
    );
  }
}

async function findProjectDefinition(document, position) {
  const line = document.lineAt(position.line).text;
  const component = readAttribute(line, "vd-component", "name");

  if (component) {
    return findExistingProjectFile([
      `src/components/${component}.vd`,
      `src/components/${component}/index.html`
    ]);
  }

  const route = readRouteHref(line);

  if (route) {
    const relative = route === "/"
      ? "home"
      : route.replace(/^\/+|\/+$/g, "");
    return findExistingProjectFile([
      `src/pages/${relative}.vd`,
      `src/pages/${relative}/index.html`
    ]);
  }

  return null;
}

function readAttribute(line, tag, attribute) {
  if (!line.includes(`<${tag}`)) return null;
  const match = line.match(new RegExp(`\\b${attribute}=["']([^"']+)["']`));
  return match ? match[1] : null;
}

function readRouteHref(line) {
  if (!/\bvd-nav\b/.test(line)) return null;
  const match = line.match(/\bhref=["'](\/[^"'#?]*)["']/);
  return match ? match[1] : null;
}

async function findExistingProjectFile(candidates) {
  const folder = vscode.workspace.workspaceFolders?.[0];

  if (!folder) return null;

  for (const candidate of candidates) {
    const uri = vscode.Uri.joinPath(folder.uri, ...candidate.split("/"));

    try {
      await vscode.workspace.fs.stat(uri);
      return uri;
    } catch {
      // Try the next conventional file without emitting an editor warning.
    }
  }

  return null;
}

module.exports = { activate, deactivate };
