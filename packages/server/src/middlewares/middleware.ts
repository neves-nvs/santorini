import { NextFunction, Request, Response } from "express";
import { ValidationFailedError } from "@/errors/HttpErrors.ts";
import logger from "@/logger.ts";
import { sanitizeForLog } from "@/logSanitizer.ts";
import { z } from "zod";

export function deprecate(req: Request, res: Response, next: NextFunction) {
  res.setHeader("Warning", '299 - "Deprecated API"');
  logger.warn(`Deprecated API ${sanitizeForLog(req.method)} ${sanitizeForLog(req.originalUrl)}`);
  next();
}

/** The parsed value, or a ValidationFailedError that lists what is wrong. The submitted values are not echoed. */
export function parseRequest<Schema extends z.core.$ZodType>(schema: Schema, value: unknown): z.output<Schema> {
  const parsed = z.safeParse(schema, value);
  if (!parsed.success) {
    throw new ValidationFailedError(
      parsed.error.issues.map((issue) => ({ path: issue.path.map(String), message: issue.message })),
    );
  }
  return parsed.data;
}

/** Replaces the body with its parsed form, so a handler reads a body that is typed and already normalised. */
export const validateBody = (schema: z.core.$ZodType) => (req: Request, _res: Response, next: NextFunction) => {
  req.body = parseRequest(schema, req.body);
  next();
};
