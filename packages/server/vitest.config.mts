import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    reporters: ["tree"],
    silent: "passed-only",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/migrations/**", "src/runMigrations.ts"],
      reporter: ["text-summary", "json-summary", "cobertura"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/integration/globalSetup.ts"],
          setupFiles: ["tests/integration/setup.ts"],
        },
      },
    ],
  },
});
