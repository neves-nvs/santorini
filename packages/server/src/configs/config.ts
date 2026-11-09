import { randomBytes } from "crypto";
import dotenv from "dotenv";

dotenv.config();

const isDevOrTest = ["development", "test"].includes(process.env.NODE_ENV ?? "");
const REQUIRED_ENV_VARS = ["JWT_SECRET", "DB_PASSWORD"];
const missingEnvVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
if (missingEnvVars.length && !isDevOrTest) {
  throw new Error(`Missing env vars: ${missingEnvVars.join(", ")} (or run with NODE_ENV=development)`);
}

const DEFAULT_PORT = 8081;

export const PORT = process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_PORT;

function generateDevSecret() {
  console.warn("WARNING: JWT_SECRET is not set, using a random one; logins reset on restart");
  return randomBytes(32).toString("hex");
}

export const JWT_SECRET = process.env.JWT_SECRET || generateDevSecret();

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
