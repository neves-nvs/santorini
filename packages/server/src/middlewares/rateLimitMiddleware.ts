import { RATE_LIMITED_RESPONSE } from "@/errors/httpError.ts";
import { config } from "@/configs/config.ts";
import { rateLimit } from "express-rate-limit";

export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000,
  limit: () => config.rateLimit,
  message: RATE_LIMITED_RESPONSE,
  standardHeaders: true,
  legacyHeaders: false,
});
