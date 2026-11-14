import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { loadConfig } from "./loadConfig.ts";

dotenv.config();

export const config = loadConfig(process.env, fileURLToPath(new URL("../../.dev-jwt-secret", import.meta.url)));

if (!config.db.password) {
  console.log("DB_PASSWORD is not set");
}
