import { resolveJwtSecret } from "./jwtSecret.ts";

export interface Config {
  port: number;
  jwtSecret: string;
  allowedOrigins: string[];
  trustProxy: string | number;
  registrationEnabled: boolean;
  authRateLimit: number;
  rateLimit: number;
  google: { clientId: string | undefined; clientSecret: string | undefined };
  db: { host: string; port: number; user: string; database: string; password: string | undefined };
  logging: { level: string; httpFormat: string; force: boolean };
}

const DEFAULT_PORT = 3000;
const MAX_PORT = 65535;
const DEFAULT_ALLOWED_ORIGINS = "http://localhost:5174";
const DEFAULT_AUTH_RATE_LIMIT = 20;
const DEFAULT_RATE_LIMIT = 300;
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

function withoutEmptyValues(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ""));
}

function originProblem(origin: string): string | undefined {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return "must start with http:// or https://";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "must start with http:// or https://";
  if (url.pathname === "/" && !url.search && !url.hash && origin.endsWith("/")) return "must not end with a slash";
  if (url.pathname !== "/" || url.search || url.hash) return "must not have a path, query or fragment";
  if (url.port === "" && /:\d+$/.test(origin)) return "must not name the default port";
  if (url.origin !== origin) return `must be written as ${url.origin}`;
  return undefined;
}

export function loadConfig(rawEnv: NodeJS.ProcessEnv, devSecretFile: string): Config {
  const env = withoutEmptyValues(rawEnv);
  const problems: string[] = [];

  const wholeNumber = (name: string, fallback: number, max = Number.MAX_SAFE_INTEGER): number => {
    const value = env[name];
    if (value === undefined) return fallback;
    const number = Number(value);
    if (/^\d+$/.test(value) && number >= 1 && number <= max) return number;
    const range = max === Number.MAX_SAFE_INTEGER ? "" : ` from 1 to ${max}`;
    problems.push(`${name} must be a whole number${range}, got "${value}"`);
    return fallback;
  };

  let jwtSecret = "";
  try {
    jwtSecret = resolveJwtSecret({ configuredSecret: env.JWT_SECRET, nodeEnv: env.NODE_ENV, devSecretFile });
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    problems.push(error.message);
  }

  if (env.NODE_ENV === "production" && !env.DB_PASSWORD) problems.push("DB_PASSWORD is not set");

  const allowedOrigins = (env.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS).split(",").map((origin) => origin.trim());
  for (const origin of allowedOrigins) {
    const problem = originProblem(origin);
    if (problem) problems.push(`ALLOWED_ORIGINS "${origin}" ${problem}`);
  }

  const config: Config = {
    port: wholeNumber("PORT", DEFAULT_PORT, MAX_PORT),
    jwtSecret,
    allowedOrigins,
    trustProxy: parseTrustProxy(env.TRUST_PROXY ?? DEFAULT_TRUST_PROXY),
    registrationEnabled: env.REGISTRATION_ENABLED !== "false",
    authRateLimit: wholeNumber("AUTH_RATE_LIMIT", DEFAULT_AUTH_RATE_LIMIT),
    rateLimit: wholeNumber("RATE_LIMIT", DEFAULT_RATE_LIMIT),
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    db: {
      host: env.DB_HOST ?? DEFAULT_DB_HOST,
      port: wholeNumber("DB_PORT", DEFAULT_DB_PORT, MAX_PORT),
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

  if (problems.length > 0) {
    throw new Error(`Invalid configuration:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
  }
  return config;
}
