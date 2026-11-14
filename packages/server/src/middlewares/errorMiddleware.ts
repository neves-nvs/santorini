import { NextFunction, Request, Response } from "express";

import { StatusCodes } from "http-status-codes";
import logger from "../logger.ts";

interface HttpError extends Error {
  status?: number;
  errors?: Array<{ msg: string }>;
}

const errorHandler = (err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err.message, { stack: err.stack });

  if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
    const validationErrors = err.errors.map((error) => error.msg).join(", ");
    logger.warn(`Validation error: ${validationErrors}`);
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ message: validationErrors });
  }

  const statusCode = err.status || StatusCodes.INTERNAL_SERVER_ERROR;

  res.status(statusCode).json({
    message: statusCode >= StatusCodes.INTERNAL_SERVER_ERROR ? "Internal Server Error" : err.message,
  });
};

export default errorHandler;
