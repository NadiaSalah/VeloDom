/**
 * Module: VeloDom VS Code Language Tools
 *
 * Reuses the public VeloDom compiler language-service API for diagnostics and
 * directive metadata. Project convention indexing stays editor-only.
 */

const vscode = require("vscode");
const { indexProjectPaths } = require("./project-index.js");

/** Activates optional VeloDom editor diagnostics and completions. */
function activate(context) {
  const diagnostics = vscode.languages.createDiagnosticCollection("velodom");
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    [{ language: "velodom" }, { language: "html", scheme: "file" }],
    {
      async provideCompletionItems(document, position) {
        if (!shouldAnalyze(document)) return [];
        const projectItems = await createConventionCompletions(document, position);

        if (projectItems.length) return projectItems;

        return loadCompiler().getVeloDomDirectiveCompletions().map(item => {
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

/** Releases VS Code-managed subscriptions when the extension is unloaded. */
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
    const project = await readProjectIndex();

    return project.uriByPath.get(project.index.componentFiles[component]) || null;
  }

  const route = readRouteHref(line);

  if (route) {
    const project = await readProjectIndex();

    return project.uriByPath.get(project.index.routeFiles[route]) || null;
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

async function createConventionCompletions(document, position) {
  if (!vscode.workspace.getConfiguration("velodom.language")
    .get("enableConventionalCompletions", true)) {
    return [];
  }

  const line = document.lineAt(position.line).text.slice(0, position.character);
  const project = await readProjectIndex();

  if (/<vd-component\b[^>]*\bname=["'][^"']*$/.test(line)) {
    return project.index.componentNames.map(name => {
      const item = new vscode.CompletionItem(
        name,
        vscode.CompletionItemKind.Class
      );
      item.detail = "VeloDom component";
      return item;
    });
  }

  if (/\bvd-nav\b/.test(line) && /\bhref=["'][^"']*$/.test(line)) {
    return project.index.routes.map(route => {
      const item = new vscode.CompletionItem(
        route,
        vscode.CompletionItemKind.Reference
      );
      item.detail = "VeloDom route";
      return item;
    });
  }

  return [];
}

async function readProjectIndex() {
  const folder = vscode.workspace.workspaceFolders?.[0];

  if (!folder) {
    return {
      index: indexProjectPaths([]),
      uriByPath: new Map()
    };
  }

  const files = await Promise.all([
    vscode.workspace.findFiles("src/components/**/*.vd"),
    vscode.workspace.findFiles("src/components/**/index.html"),
    vscode.workspace.findFiles("src/pages/**/*.vd"),
    vscode.workspace.findFiles("src/pages/**/index.html")
  ]);
  const uriByPath = new Map();

  for (const uri of files.flat()) {
    uriByPath.set(vscode.workspace.asRelativePath(uri, false), uri);
  }

  return {
    index: indexProjectPaths([...uriByPath.keys()]),
    uriByPath
  };
}

module.exports = { activate, deactivate };
