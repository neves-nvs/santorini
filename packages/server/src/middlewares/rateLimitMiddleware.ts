import { rateLimit } from "express-rate-limit";

import { config } from "@/configs/config.ts";
import { RateLimitedError } from "@/errors/HttpErrors.ts";

export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000,
  limit: () => config.rateLimit,
  handler: (_req, _res, next) => next(new RateLimitedError()),
  standardHeaders: true,
  legacyHeaders: false,
});
