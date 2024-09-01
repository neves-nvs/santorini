import { NextFunction, Request, Response } from "express";
import { param, validationResult } from "express-validator";

import logger from "../logger";

export function deprecate(req: Request, res: Response, next: NextFunction) {
  res.setHeader("Warning", '299 - "Deprecated API"');
  logger.warn(`Deprecated API ${req.method} ${req.originalUrl}`);
  next();
}

export const checkValidation = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const validateUUIDParam = (paramName: string) => {
  return param(paramName).isUUID().withMessage(`${paramName} must be a valid UUID`);
};
