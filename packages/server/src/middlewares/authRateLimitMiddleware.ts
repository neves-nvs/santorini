import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { RATE_LIMITED_RESPONSE } from "@/errors/httpError.ts";
import { config } from "@/configs/config.ts";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_KEYED_USERNAME_LENGTH = 64;

const limits = {
  windowMs: WINDOW_MS,
  limit: () => config.authRateLimit,
  message: RATE_LIMITED_RESPONSE,
  standardHeaders: true,
  legacyHeaders: false,
} as const;

// Counts failed logins only, per client and username, so people behind one address do not lock each other out.
export const loginRateLimitMiddleware = rateLimit({
  ...limits,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip ?? "")}:${String(req.body?.username).slice(0, MAX_KEYED_USERNAME_LENGTH)}`,
});

export const registrationRateLimitMiddleware = rateLimit(limits);
