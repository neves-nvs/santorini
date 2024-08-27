module.exports = {
  displayName: "unit",
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/unit/**/*.test.ts"],
  //   setupFilesAfterEnv: ["<rootDir>/tests/setupUnitTests.ts"],
  // verbose: true,
  moduleNameMapper: {
    "@src/(.*)": "<rootDir>/src/$1",
  },
};
