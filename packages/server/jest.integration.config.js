module.exports = {
  displayName: "integration",
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/integration/**/*.test.ts"],
  globalSetup: "<rootDir>/tests/integration/globalSetup.ts",
  globalTeardown: "<rootDir>/tests/integration/globalTeardown.ts",
  setupFiles: ["<rootDir>/tests/integration/setup.ts"],
  setTimeout: 30000,
  moduleNameMapper: {
    "@src/(.*)": "<rootDir>/src/$1",
  },
};
