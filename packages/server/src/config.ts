import dotenv from "dotenv";
import logger from "./logger";

dotenv.config();

export const PORT = process.env.PORT || 8081;

export const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error("JWT secret not set");
  process.exit(1);
}

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const DB_HOST = process.env.DB_HOST;
export const DB_PORT = process.env.DB_PORT;
