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
      "packages/velodom/lib/**",
      "packages/velodom/types/**",
      "examples/velodom-blog/dist/**"
    ]
  },
  {
    files: [
      "packages/velodom/src/**/*.ts",
      "examples/**/*.ts"
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
      "packages/velodom/src/**/*.ts"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error"
    }
  },
  {
    files: [
      "packages/velodom/bin/**/*.js",
      "examples/**/*.js",
      "scripts/**/*.mjs",
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
