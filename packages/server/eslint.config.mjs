import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

const databaseImport = {
  group: ["**/src/database.ts"],
  message:
    "Use getTestDb() or cleanupTestData() from tests/integration/helper/testDb.ts instead of importing the database directly.",
};

const userRepositoryImport = {
  group: ["**/src/users/userRepository.ts"],
  message:
    "Create users with generateTestUser() or createTestUserWithLogin() from tests/integration/helper/helpers.ts.",
};

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**/*", "node_modules/**/*", ".config/**/*", "src/migrations/**/*", "src/runMigrations.ts"],
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
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["tests/**/*.ts"],
    ignores: ["tests/integration/helper/**", "tests/integration/setup.ts", "tests/integration/globalSetup.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [databaseImport, userRepositoryImport] }],
    },
  },
  {
    files: ["tests/integration/users/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [databaseImport] }],
    },
  },
];
