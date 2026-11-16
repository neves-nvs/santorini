import { config } from "@/configs/config.ts";
import { rateLimit } from "express-rate-limit";

export const authRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: () => config.authRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});
