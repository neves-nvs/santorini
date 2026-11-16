import { config } from "../configs/config.ts";
import { rateLimit } from "express-rate-limit";

export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000,
  limit: () => config.rateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});
