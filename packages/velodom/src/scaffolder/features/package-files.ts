/**
 * ----------------------------------------
 * Module: Scaffolder Package Files
 * ----------------------------------------
 *
 * Generates package metadata and tool configuration from the resolved feature
 * plan. Disabled features contribute no scripts or dependencies.
 * ----------------------------------------
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ScaffoldPlan } from "../types.ts";

/** Writes package.json, Vite, language, lint, format, and test configuration. */
export async function writeProjectConfiguration(
  plan: ScaffoldPlan,
  velodomVersion: string
) {
  await writeJson(join(plan.destination, "package.json"), createManifest(plan, velodomVersion));
  await writeText(join(plan.destination, "index.html"), createHtmlShell(plan));
  await writeText(join(plan.destination, viteConfigName(plan)), createViteConfig(plan));
  await writeText(
    join(plan.destination, plan.language === "typescript" ? "tsconfig.json" : "jsconfig.json"),
    createLanguageConfigSource(plan)
  );

  if (plan.eslint) {
    await writeText(join(plan.destination, "eslint.config.js"), createEslintConfig(plan));
  }

  if (plan.prettier) {
    await writeText(join(plan.destination, ".prettierrc.json"), "{\n  \"semi\": true,\n  \"singleQuote\": false\n}\n");
    await writeText(join(plan.destination, ".prettierignore"), "dist\nnode_modules\ncoverage\n");
  }

  if (plan.testing === "e2e" || plan.testing === "all") {
    await writeText(join(plan.destination, "playwright.config.js"), createPlaywrightConfig(plan));
  }
}

/** Creates the manifest. */
function createManifest(plan: ScaffoldPlan, velodomVersion: string) {
  const scripts: Record<string, string> = {
    dev: "vite",
    build: "vite build",
    preview: "vite preview"
  };
  const dependencies: Record<string, string> = {
    velodom: `^${velodomVersion}`
  };
  const devDependencies: Record<string, string> = {
    vite: "^8.1.3"
  };

  if (plan.lab) scripts.lab = "vd lab";

  if (plan.language === "typescript") {
    scripts.typecheck = "tsc --noEmit";
    devDependencies["@types/node"] = "^26.1.0";
    devDependencies.typescript = "^6.0.3";
  }

  if (plan.tailwind) {
    devDependencies["@tailwindcss/vite"] = "^4.3.0";
    devDependencies.tailwindcss = "^4.3.0";
  }

  if (plan.eslint) {
    scripts.lint = "eslint .";
    devDependencies["@eslint/js"] = "^10.0.1";
    devDependencies.eslint = "^10.6.0";
    devDependencies.globals = "^17.7.0";

    if (plan.language === "typescript") {
      devDependencies["typescript-eslint"] = "^8.62.1";
    }
  }

  if (plan.prettier) {
    scripts.format = "prettier . --write";
    scripts["format:check"] = "prettier . --check";
    devDependencies.prettier = "^3.6.2";
  }

  if (plan.testing === "unit" || plan.testing === "all") {
    scripts["test:unit"] = "node --test tests/unit/*.test.*";
  }

  if (plan.testing === "e2e" || plan.testing === "all") {
    scripts["test:e2e"] = "playwright test";
    devDependencies["@playwright/test"] = "^1.61.1";
  }

  if (plan.testing === "unit") scripts.test = scripts["test:unit"];
  if (plan.testing === "e2e") scripts.test = scripts["test:e2e"];
  if (plan.testing === "all") {
    scripts.test = `${scripts["test:unit"]} && ${scripts["test:e2e"]}`;
  }

  return {
    name: plan.projectName,
    private: true,
    version: "0.0.0",
    type: "module",
    scripts,
    imports: {
      "#app/*": "./src/*"
    },
    dependencies,
    devDependencies
  };
}

/** Creates the vite config. */
function createViteConfig(plan: ScaffoldPlan) {
  const extension = plan.language === "typescript" ? "ts" : "js";
  const imports = [
    'import { fileURLToPath, URL } from "node:url";',
    'import { defineConfig } from "vite";',
    ...(plan.tailwind ? ['import tailwindcss from "@tailwindcss/vite";'] : []),
    'import { velodom } from "velodom/vite-plugin";',
    ...(plan.i18n ? [`import { localizationOptions } from "./src/i18n.${extension}";`] : [])
  ];
  const pluginOptions = plan.i18n ? "{ localization: localizationOptions }" : "";
  const plugins = [
    `velodom(${pluginOptions})`,
    ...(plan.tailwind ? ["tailwindcss()"] : [])
  ];

  return `${imports.join("\n")}\n\nexport default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [${plugins.join(", ")}],
});
`;
}

/** Creates the language config source. */
function createLanguageConfigSource(plan: ScaffoldPlan) {
  if (plan.language === "javascript") {
    return `{
  "compilerOptions": {
    "baseUrl": ".",
    "ignoreDeprecations": "6.0",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "paths": {
      "@/*": ["src/*"]
    },
    "allowJs": true,
    "checkJs": false
  },
  "include": ["src/**/*.js", "vite.config.js"]
}
`;
  }

  const include = [
    "src/**/*.ts",
    "vite.config.ts",
    ...(plan.testing === "e2e" || plan.testing === "all" ? ["tests/**/*.ts"] : [])
  ].map(value => JSON.stringify(value)).join(", ");

  return `{
  "compilerOptions": {
    "baseUrl": ".",
    "ignoreDeprecations": "6.0",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "paths": {
      "@/*": ["src/*"]
    },
    "target": "ES2022",
    "allowImportingTsExtensions": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "types": ["node", "vite/client"]
  },
  "include": [${include}]
}
`;
}

/** Creates the eslint config. */
function createEslintConfig(plan: ScaffoldPlan) {
  const typeImports = plan.language === "typescript"
    ? 'import tseslint from "typescript-eslint";\n'
    : "";
  const configurations = plan.language === "typescript"
    ? "  js.configs.recommended,\n  ...tseslint.configs.recommended,"
    : "  js.configs.recommended,";

  const pattern = plan.language === "typescript" ? "**/*.{js,ts}" : "**/*.js";

  return `import js from "@eslint/js";
import globals from "globals";
${typeImports}
export default [
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
${configurations}
  {
    files: ["${pattern}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
  },
];
`;
}

/** Creates the HTML application shell. */
function createHtmlShell(plan: ScaffoldPlan) {
  const extension = plan.language === "typescript" ? "ts" : "js";
  const title = plan.starter === "blog" ? "VeloDom Blog" : "VeloDom Starter";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/velodom-favicon.svg" />
    <meta
      name="description"
      content="A ${plan.starter} application built with VeloDom."
    />
    <title>${title}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.${extension}"></script>
  </body>
</html>
`;
}

/** Creates the playwright config. */
function createPlaywrightConfig(plan: ScaffoldPlan) {
  const devCommand = plan.packageManager === "pnpm" || plan.packageManager === "yarn"
    ? `${plan.packageManager} dev`
    : `${plan.packageManager} run dev`;

  return `import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "${devCommand} -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
`;
}

/** Performs the internal `viteConfigName()` operation. */
function viteConfigName(plan: ScaffoldPlan) {
  return plan.language === "typescript" ? "vite.config.ts" : "vite.config.js";
}

/** Writes deterministic JSON output. */
async function writeJson(file: string, value: unknown) {
  await writeText(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** Writes the text. */
async function writeText(file: string, source: string) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, source);
}
