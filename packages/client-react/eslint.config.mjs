import globals from "globals";
import i18next from "eslint-plugin-i18next";
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

const parentImports = { group: ["..", "../**"], message: "Import across folders through the @/ alias; ./ stays for the same folder." };

// The src folders are domains (game, user) and shared. Inside a domain: model <- update <- view, and services
// (the side effects) beside them. Lower layers never import upward, and a domain never reaches into another one.
const processEnv = {
  selector: "MemberExpression[object.name='process'][property.name='env']",
  message: "Client code reads configuration from import.meta.env, not process.env.",
};
const parentPath = {
  selector: "CallExpression[callee.object.name='vi'][callee.property.name=/^(mock|doMock|importActual)$/] > Literal.arguments:first-child[value=/^\\.\\./], ImportExpression > Literal.source[value=/^\\.\\./]",
  message: "Use the @/ alias instead of a ../ path.",
};
// no-restricted-imports does not see import(), so every layer rule is mirrored as a syntax selector
const layer = (folders, message) => ({
  group: folders.flatMap((folder) => [folder, `${folder}/**`]),
  message,
  selector: `ImportExpression > Literal.source[value=/^(${folders.map((folder) => folder.replaceAll("/", "\\/")).join("|")})(\\/|$)/]`,
});
const restricted = (...layers) => ({
  "no-restricted-imports": ["error", { patterns: [parentImports, ...layers.map(({ group, message }) => ({ group, message }))] }],
  "no-restricted-syntax": ["error", processEnv, parentPath, ...layers.map(({ selector, message }) => ({ selector, message }))],
});
const userInternals = ["update", "view", "services"].map((role) => `@/user/${role}`);
const crossDomain = {
  game: [layer(userInternals, "game reads the current user through user/model only.")],
  user: [layer(["@/game"], "user must not import from game/.")],
};
const forbiddenWithinDomain = { model: ["update", "view", "services"], update: ["view", "services"], services: ["update", "view"], view: [] };
const layerBlocks = Object.keys(crossDomain).flatMap((domain) =>
  Object.entries(forbiddenWithinDomain).map(([role, forbidden]) => ({
    files: [`src/${domain}/${role}/**/*.ts`, `src/${domain}/${role}/**/*.tsx`],
    rules: restricted(
      ...crossDomain[domain],
      ...forbidden.map((other) => layer([`@/${domain}/${other}`], `${domain}/${role} must not import from ${domain}/${other}.`)),
    ),
  })),
);

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
    rules: restricted(),
  },
  ...layerBlocks,
  {
    files: ["src/shared/**/*.ts", "src/shared/**/*.tsx"],
    rules: restricted(layer(["@/game", "@/user"], "shared has no domain: it must not import from game/ or user/.")),
  },
  {
    // Every user-facing string in these folders goes through t(). game/ and the lobby are not converted yet.
    files: ["src/shared/**/*.tsx", "src/user/**/*.tsx", "src/App.tsx"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": ["error", {
        mode: "jsx-only",
        "jsx-attributes": {
          exclude: ["className", "styleName", "style", "type", "key", "id", "width", "height", "role", "path", "to", "htmlFor", "autoComplete", "lang", "rel", "target", "href", "src", "name", "viewBox", "d", "fill", "stroke", "aria-live", "aria-invalid", "aria-describedby", "aria-hidden", "aria-current", "aria-busy"],
        },
      }],
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
