import { ipKeyGenerator, Options, rateLimit } from "express-rate-limit";

import { config } from "@/configs/config.ts";
import { RateLimitedError } from "@/errors/HttpErrors.ts";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_KEYED_USERNAME_LENGTH = 64;

const limits = {
  windowMs: WINDOW_MS,
  limit: () => config.authRateLimit,
  handler: (_req, _res, next) => next(new RateLimitedError()),
  standardHeaders: true,
  legacyHeaders: false,
} satisfies Partial<Options>;

// Counts failed logins only, per client and username, so people behind one address do not lock each other out.
export const loginRateLimitMiddleware = rateLimit({
  ...limits,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip ?? "")}:${String(req.body?.username).trim().toLowerCase().slice(0, MAX_KEYED_USERNAME_LENGTH)}`,
});

export const registrationRateLimitMiddleware = rateLimit(limits);
