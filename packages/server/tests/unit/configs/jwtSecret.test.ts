import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { resolveJwtSecret } from "../../../src/configs/jwtSecret.ts";
import { tmpdir } from "os";

describe("resolveJwtSecret", () => {
  let devSecretFile: string;

  beforeEach(() => {
    devSecretFile = join(mkdtempSync(join(tmpdir(), "jwt-secret-")), ".dev-jwt-secret");
  });

  it("uses the configured secret in any environment", () => {
    expect(resolveJwtSecret({ configuredSecret: "configured", nodeEnv: "production", devSecretFile })).toBe(
      "configured",
    );
  });

  it.each(["production", "test", undefined])("fails without a secret when NODE_ENV is %s", (nodeEnv) => {
    expect(() => resolveJwtSecret({ configuredSecret: undefined, nodeEnv, devSecretFile })).toThrow(
      "JWT_SECRET is not set",
    );
  });

  it("generates a secret in development and keeps it across calls", () => {
    const first = resolveJwtSecret({ configuredSecret: undefined, nodeEnv: "development", devSecretFile });
    const second = resolveJwtSecret({ configuredSecret: undefined, nodeEnv: "development", devSecretFile });

    expect(first).toHaveLength(64);
    expect(second).toBe(first);
    expect(readFileSync(devSecretFile, "utf8")).toBe(first);
  });

  it("reads an existing development secret file", () => {
    writeFileSync(devSecretFile, "from-file\n");

    expect(resolveJwtSecret({ configuredSecret: undefined, nodeEnv: "development", devSecretFile })).toBe("from-file");
  });
});
