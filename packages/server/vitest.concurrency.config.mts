import { defineConfig } from "vitest/config";

// Not part of `npm test`, CI or scripts/check: run it on purpose with `npm run test:concurrency` (needs Docker).
export default defineConfig({
  resolve: { alias: { "@tests": `${import.meta.dirname}/tests`, "@": `${import.meta.dirname}/src` } },
  test: {
    name: "concurrency",
    globals: true,
    environment: "node",
    reporters: ["tree"],
    silent: "passed-only",
    // Many password hashes at once on a busy machine can pass the default of five seconds
    testTimeout: 30_000,
    env: { JWT_SECRET: "integration-test-secret" },
    include: ["tests/concurrency/**/*.test.ts"],
    globalSetup: ["tests/integration/globalSetup.ts"],
    setupFiles: ["tests/integration/setup.ts"],
  },
});
