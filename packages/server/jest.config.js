module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
  moduleNameMapper: {
    "@src/(.*)": "<rootDir>/src/$1",
  },
  projects: ["<rootDir>/jest.unit.config.js", "<rootDir>/jest.integration.config.js"],
};
