import { RateLimitedError } from "@/errors/HttpErrors.ts";
import { config } from "@/configs/config.ts";
import { rateLimit } from "express-rate-limit";

export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000,
  limit: () => config.rateLimit,
  handler: (_req, _res, next) => next(new RateLimitedError()),
  standardHeaders: true,
  legacyHeaders: false,
});
