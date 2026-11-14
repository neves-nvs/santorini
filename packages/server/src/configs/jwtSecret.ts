import { existsSync, readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";

export function resolveJwtSecret(options: {
  configuredSecret: string | undefined;
  nodeEnv: string | undefined;
  devSecretFile: string;
}): string {
  const { configuredSecret, nodeEnv, devSecretFile } = options;

  if (configuredSecret) {
    return configuredSecret;
  }

  if (nodeEnv !== "development") {
    throw new Error("JWT_SECRET is not set");
  }

  if (existsSync(devSecretFile)) {
    return readFileSync(devSecretFile, "utf8").trim();
  }

  const generatedSecret = randomBytes(32).toString("hex");
  writeFileSync(devSecretFile, generatedSecret, { mode: 0o600 });
  return generatedSecret;
}
