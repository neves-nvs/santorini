import { NextFunction, Request, Response } from "express";

import { StatusCodes } from "http-status-codes";
import logger from "../logger";

interface HttpError extends Error {
  status?: number;
  errors?: Array<{ msg: string }>;
}

const errorHandler = (err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err.message, { stack: err.stack });

  const statusCode = err.status || StatusCodes.INTERNAL_SERVER_ERROR;

  if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
    const validationErrors = err.errors.map((error) => error.msg).join(", ");
    logger.warn(`Validation error: ${validationErrors}`);
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      message: validationErrors,
      stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
  }

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorHandler;
