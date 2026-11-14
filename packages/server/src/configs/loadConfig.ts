import { resolveJwtSecret } from "./jwtSecret.ts";

export interface Config {
  port: number;
  jwtSecret: string;
  allowedOrigins: string[];
  trustProxy: string | number;
  google: { clientId: string | undefined; clientSecret: string | undefined };
  db: { host: string; port: number; user: string; database: string; password: string | undefined };
  logging: { level: string; httpFormat: string; force: boolean };
}

const DEFAULT_PORT = 3000;
const DEFAULT_ALLOWED_ORIGINS = "http://localhost:5174";
const DEFAULT_TRUST_PROXY = "loopback, linklocal, uniquelocal";
const DEFAULT_DB_HOST = "localhost";
const DEFAULT_DB_PORT = 5432;
const DEFAULT_DB_USER = "postgres";
const DEFAULT_DB_DATABASE = "postgres";
const DEFAULT_LOG_LEVEL = "http";
const DEFAULT_HTTP_LOG_FORMAT = "dev";

function parseTrustProxy(value: string): string | number {
  return /^\d+$/.test(value) ? parseInt(value) : value;
}

export function loadConfig(env: NodeJS.ProcessEnv, devSecretFile: string): Config {
  return {
    port: env.PORT ? parseInt(env.PORT) : DEFAULT_PORT,
    jwtSecret: resolveJwtSecret({
      configuredSecret: env.JWT_SECRET,
      nodeEnv: env.NODE_ENV,
      devSecretFile,
    }),
    allowedOrigins: (env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS).split(",").map((origin) => origin.trim()),
    trustProxy: parseTrustProxy(env.TRUST_PROXY ?? DEFAULT_TRUST_PROXY),
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    db: {
      host: env.DB_HOST ?? DEFAULT_DB_HOST,
      port: env.DB_PORT ? parseInt(env.DB_PORT) : DEFAULT_DB_PORT,
      user: env.DB_USER ?? DEFAULT_DB_USER,
      database: env.DB_DATABASE ?? DEFAULT_DB_DATABASE,
      password: env.DB_PASSWORD,
    },
    logging: {
      level: env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL, // winston
      httpFormat: env.LOG_FORMAT ?? DEFAULT_HTTP_LOG_FORMAT, // morgan
      force: env.FORCE_LOGS === "true",
    },
  };
}
