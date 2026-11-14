import base from "./jest.base.js";

export default {
  ...base,
  displayName: "integration",
  testMatch: ["**/tests/integration/**/*.test.ts"],
  globalSetup: "<rootDir>/tests/integration/globalSetup.ts",
  globalTeardown: "<rootDir>/tests/integration/globalTeardown.ts",
  setupFiles: ["<rootDir>/tests/integration/setup.ts"],
};
