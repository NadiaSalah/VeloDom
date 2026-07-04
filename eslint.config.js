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
      "src/**/*.ts",
      "packages/**/*.ts"
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
