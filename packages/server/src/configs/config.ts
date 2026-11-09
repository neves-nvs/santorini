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
let secret = process.env.JWT_SECRET;
if (!secret) {
  // shortcut: a generated secret is per process (logins reset on restart), so dev/test only
  if (!["development", "test"].includes(process.env.NODE_ENV ?? "")) {
    throw new Error("JWT_SECRET is not set (use NODE_ENV=development for a generated one)");
  }
  console.warn("WARNING: JWT_SECRET is not set, using a random one; logins reset on restart");
  secret = randomBytes(32).toString("hex");
}
export const JWT_SECRET = secret;

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
