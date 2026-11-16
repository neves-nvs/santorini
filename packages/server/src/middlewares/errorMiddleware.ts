import { NextFunction, Request, Response } from "express";

import { StatusCodes } from "http-status-codes";
import logger from "@/logger.ts";
import { sendError } from "@/errors/httpError.ts";

interface HttpError extends Error {
  status?: number;
  errors?: Array<{ msg: string }>;
}

const errorHandler = (err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err.message, { stack: err.stack });

  if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
    const validationErrors = err.errors.map((error) => error.msg).join(", ");
    logger.warn(`Validation error: ${validationErrors}`);
    return sendError(res, StatusCodes.UNPROCESSABLE_ENTITY, "validation_failed", validationErrors);
  }

  const statusCode = err.status || StatusCodes.INTERNAL_SERVER_ERROR;

  if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
    return sendError(res, statusCode, "internal", "Internal Server Error");
  }
  sendError(res, statusCode, statusCode === StatusCodes.FORBIDDEN ? "forbidden" : "invalid_message", err.message);
};

export default errorHandler;
