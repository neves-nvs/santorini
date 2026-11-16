import { NextFunction, Request, Response } from "express";
import { param, validationResult } from "express-validator";

import { StatusCodes } from "http-status-codes";
import logger from "@/logger.ts";
import { sanitizeForLog } from "@/logSanitizer.ts";
import { sendError } from "@/errors/httpError.ts";

export function deprecate(req: Request, res: Response, next: NextFunction) {
  res.setHeader("Warning", '299 - "Deprecated API"');
  logger.warn(`Deprecated API ${sanitizeForLog(req.method)} ${sanitizeForLog(req.originalUrl)}`);
  next();
}

export const checkValidation = (req: Request, res: Response, next: NextFunction) => {
  // The submitted value is left out: it can be a password, and the log redaction cannot see it under this key.
  const errors = validationResult(req).formatWith((error) => ({
    msg: error.msg,
    path: error.type === "field" ? error.path : "",
  }));
  if (!errors.isEmpty()) {
    const issues = errors.array().map(({ path, msg }) => ({ path: path ? [path] : [], message: String(msg) }));
    return sendError(
      res,
      StatusCodes.BAD_REQUEST,
      "validation_failed",
      issues.map((issue) => issue.message).join(", "),
      { issues },
    );
  }
  next();
};

export const validateUUIDParam = (paramName: string) => {
  return param(paramName).isUUID().withMessage(`${paramName} must be a valid UUID`);
};

export const validateIntParam = (paramName: string) => {
  return param(paramName).isInt({ min: 1 }).withMessage(`${paramName} must be a valid positive integer`);
};
