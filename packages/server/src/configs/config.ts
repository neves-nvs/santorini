import dotenv from "dotenv";
import { fileURLToPath } from "url";

import { resolveJwtSecret } from "./jwtSecret.ts";

dotenv.config();

const DEFAULT_PORT = 3000;

export const PORT = process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_PORT;

export const JWT_SECRET = resolveJwtSecret({
  configuredSecret: process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV,
  devSecretFile: fileURLToPath(new URL("../../.dev-jwt-secret", import.meta.url)),
});

const DEFAULT_ALLOWED_ORIGINS = "http://localhost:5174";

export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
  .split(",")
  .map((origin) => origin.trim());

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const DEFAULT_DB_HOST = "localhost";
const DEFAULT_DB_PORT = 5432;
const DEFAULT_DB_USER = "postgres";
const DEFAULT_DB_DATABASE = "postgres";

export const DB_DATABASE = process.env.DB_DATABASE ?? DEFAULT_DB_DATABASE;

export const DB_HOST = process.env.DB_HOST ?? DEFAULT_DB_HOST;

export const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : DEFAULT_DB_PORT;

export const DB_USER = process.env.DB_USER ?? DEFAULT_DB_USER;

export const DB_PASSWORD = process.env.DB_PASSWORD;
if (!DB_PASSWORD) {
  console.log("DB_PASSWORD is not set");
}

const DEFAULT_LOG_LEVEL = "http";

export const LOG_LEVEL = process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL; // winston
export const HTTP_LOG_FORMAT = process.env.LOG_FORMAT ?? "dev"; // morgan

export const FORCE_LOGS = process.env.FORCE_LOGS === "true";
