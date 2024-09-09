import dotenv from "dotenv";

dotenv.config();

const DEFAULT_PORT = 8081;
export const PORT = process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_PORT;

const ENV_JWT_SECRET = process.env.JWT_SECRET;
if (ENV_JWT_SECRET === undefined) {
  process.exit(1);
}
export const JWT_SECRET = ENV_JWT_SECRET;

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const DB_HOST = process.env.DB_HOST;
if (!DB_HOST) {
  process.exit(1);
}

export const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined;
if (!DB_PORT) {
  process.exit(1);
}

export const DB_DATABASE = process.env.DB_DATABASE;
if (!DB_DATABASE) {
  process.exit(1);
}

export const DB_USER = process.env.DB_USER;
if (!DB_USER) {
  process.exit(1);
}

export const DB_PASSWORD = process.env.DB_PASSWORD;
if (!DB_PASSWORD) {
  process.exit(1);
}

export const LOG_LEVEL = process.env.LOG_LEVEL || "info";
export const FORCE_LOGS = process.env.FORCE_LOGS === "true";
