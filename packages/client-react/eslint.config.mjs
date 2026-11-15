import globals from "globals";
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["dist/**/*", "node_modules/**/*", "coverage/**/*", "playwright-report/**/*", "test-results/**/*"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  // TODO: remove these test overrides by typing the mocks and moving the helper's non-component exports out of r3f-test-utils.tsx
  {
    files: ["src/__tests__/**/*.ts", "src/__tests__/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["..", "../**"], message: "Import across folders through the @/ alias; ./ stays for the same folder." }] },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: "Client code reads configuration from import.meta.env, not process.env.",
        },
        {
          selector: "CallExpression[callee.object.name='vi'][callee.property.name=/^(mock|doMock|importActual)$/] > Literal.arguments:first-child[value=/^\\.\\./], ImportExpression > Literal.source[value=/^\\.\\./]",
          message: "Use the @/ alias instead of a ../ path.",
        },
      ],
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
