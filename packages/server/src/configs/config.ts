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
if (ENV_JWT_SECRET === undefined) {
  console.log("JWT_SECRET is not set");
  throw new Error("JWT_SECRET is not set");
}

export const JWT_SECRET = ENV_JWT_SECRET;

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
console.log("DB_DATABASE", DB_DATABASE);

export const DB_HOST = process.env.DB_HOST ?? DEFAULT_DB_HOST;
console.log("DB_HOST", DB_HOST);

export const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : DEFAULT_DB_PORT;
console.log("DB_PORT", DB_PORT);

export const DB_USER = process.env.DB_USER ?? DEFAULT_DB_USER;
console.log("DB_USER", DB_USER);

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
