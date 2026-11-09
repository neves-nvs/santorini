import { randomBytes } from "crypto";
import dotenv from "dotenv";

dotenv.config();

/* -------------------------------------------------------------------------- */
/*                                   PROGRAM                                  */
/* -------------------------------------------------------------------------- */
const DEFAULT_PORT = 8081;

export const PORT = process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_PORT;

/* -------------------------------------------------------------------------- */
/*                                  SECURITY                                  */
/* -------------------------------------------------------------------------- */
const ENV_JWT_SECRET = process.env.JWT_SECRET;

// Without a configured secret, generate a random one for this process. Tokens signed
// with it stop being valid on restart, and it is not shared between server instances.
function resolveJwtSecret(): string {
  if (ENV_JWT_SECRET) {
    return ENV_JWT_SECRET;
  }
  console.warn(
    "WARNING: JWT_SECRET is not set. Generated a random secret for this run; " +
      "logins will be invalidated on every restart. Set JWT_SECRET to persist sessions.",
  );
  return randomBytes(32).toString("hex");
}

export const JWT_SECRET = resolveJwtSecret();

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

/* -------------------------------------------------------------------------- */
/*                                  DATABASE                                  */
/* -------------------------------------------------------------------------- */
const DEFAULT_DB_HOST = "localhost";
const DEFAULT_DB_PORT = 5432;
const DEFAULT_DB_USER = "postgres";
const DEFAULT_DB_DATABASE = "postgres";

export const DB_DATABASE = process.env.DB_DATABASE ?? DEFAULT_DB_DATABASE;
if (!DB_DATABASE) {
  console.log("DB_DATABASE is not set");
}

export const DB_HOST = process.env.DB_HOST ?? DEFAULT_DB_HOST;
if (!DB_HOST) {
  console.log("DB_HOST is not set");
}

export const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : DEFAULT_DB_PORT;
if (!DB_PORT) {
  console.log("DB_PORT is not set");
}

export const DB_USER = process.env.DB_USER ?? DEFAULT_DB_USER;
if (!DB_USER) {
  console.log("DB_USER is not set");
}

export const DB_PASSWORD = process.env.DB_PASSWORD;
if (!DB_PASSWORD) {
  console.log("DB_PASSWORD is not set");
}

/* -------------------------------------------------------------------------- */
/*                                   LOGGING                                  */
/* -------------------------------------------------------------------------- */
const DEFAULT_LOG_LEVEL = "http";

export const LOG_LEVEL = process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL; // winston
export const HTTP_LOG_FORMAT = process.env.LOG_FORMAT ?? "dev"; // morgan

export const FORCE_LOGS = process.env.FORCE_LOGS === "true";
