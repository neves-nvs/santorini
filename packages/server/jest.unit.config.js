module.exports = {
  displayName: "unit",
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/unit/**/*.test.ts"],
  moduleNameMapper: {
    "@src/(.*)": "<rootDir>/src/$1",
  },
};
