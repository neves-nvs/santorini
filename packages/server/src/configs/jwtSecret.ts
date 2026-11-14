import { readFileSync, writeFileSync } from "fs";
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

  const existingSecret = readIfExists(devSecretFile);
  if (existingSecret !== undefined) {
    return existingSecret;
  }

  const generatedSecret = randomBytes(32).toString("hex");
  try {
    writeFileSync(devSecretFile, generatedSecret, { mode: 0o600, flag: "wx" });
    return generatedSecret;
  } catch (error) {
    if (isErrnoException(error) && error.code === "EEXIST") {
      return readFileSync(devSecretFile, "utf8").trim();
    }
    throw error;
  }
}

function readIfExists(file: string): string | undefined {
  try {
    return readFileSync(file, "utf8").trim();
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
