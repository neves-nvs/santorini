import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "dist/**/*",
      "node_modules/**/*",
      ".config/**/*",
      "src/migrations/**/*",
      "src/runMigrations.ts",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    ...tseslint.configs.recommendedTypeChecked[0],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: "./tests/tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "sort-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["..", "../**"],
              message: "Import across folders through @/ (src) or @tests/ (tests); ./ stays for the same folder.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='vi'][callee.property.name=/^(mock|doMock|importActual)$/] > Literal.arguments:first-child[value=/^\\.\\./], ImportExpression > Literal.source[value=/^\\.\\./], TSImportType Literal[value=/^\\.\\./]",
          message: "Use the @/ alias instead of a ../ path.",
        },
      ],
    },
  },
];
