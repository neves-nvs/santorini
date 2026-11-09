import { randomBytes } from "crypto";
import dotenv from "dotenv";

dotenv.config();

// Dev/test fall back to defaults and a generated JWT secret. Anywhere else (including
// NODE_ENV unset) a missing required variable stops the boot, all listed at once.
const REQUIRED = ["JWT_SECRET", "DB_PASSWORD"];
const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length && !["development", "test"].includes(process.env.NODE_ENV ?? "")) {
  throw new Error(`Missing env vars: ${missing.join(", ")} (or run with NODE_ENV=development)`);
}

const DEFAULT_PORT = 8081;

export const PORT = process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_PORT;

let secret = process.env.JWT_SECRET;
if (!secret) {
  // shortcut: a generated secret is per process (logins reset on restart), fine for dev/test only
  console.warn("WARNING: JWT_SECRET is not set, using a random one; logins reset on restart");
  secret = randomBytes(32).toString("hex");
}
export const JWT_SECRET = secret;

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

const DEFAULT_LOG_LEVEL = "http";

export const LOG_LEVEL = process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL; // winston
export const HTTP_LOG_FORMAT = process.env.LOG_FORMAT ?? "dev"; // morgan

export const FORCE_LOGS = process.env.FORCE_LOGS === "true";
