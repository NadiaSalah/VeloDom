import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const sharedRules = {
  "no-console": "off",
  "no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_"
    }
  ]
};

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "types/**"
    ]
  },
  {
    files: [
      "src/**/*.ts"
    ],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      ...sharedRules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": sharedRules["no-unused-vars"]
    }
  },
  {
    files: [
      "src/core/compiler/**/*.ts",
      "src/core/directives.ts",
      "src/core/directives/features/**/*.ts",
      "src/core/directives/runtime.ts",
      "src/core/errors/**/*.ts",
      "src/core/expression/evaluator.ts",
      "src/core/expression/parser.ts",
      "src/core/global.d.ts",
      "src/core/lifecycle.ts",
      "src/core/plugins.ts",
      "src/core/reactive.ts",
      "src/core/requests/auth.ts",
      "src/core/requests/http-client.ts",
      "src/core/resource-adapter.ts",
      "src/core/router.ts",
      "src/core/shared/**/*.ts",
      "src/core/types.ts"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error"
    }
  },
  {
    files: [
      "src/**/*.js",
      "test/**/*.js",
      "*.js"
    ],
    extends: [
      eslint.configs.recommended
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: sharedRules
  }
);
