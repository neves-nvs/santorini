import { ErrorResponse, WireError } from "@santorini/shared";
import { GameError, getHttpStatus, toWireError } from "@/errors/GameErrors.ts";
import { NextFunction, Request, Response } from "express";
import { GameRuleError } from "@santorini/engine";
import { HttpError } from "@/errors/HttpErrors.ts";
import { StatusCodes } from "http-status-codes";
import logger from "@/logger.ts";

interface ParserError extends Error {
  status?: number;
}

function describeError(error: unknown): { status: number; body: WireError } {
  if (error instanceof HttpError) {
    return { status: error.status, body: { code: error.code, message: error.message, details: error.details } };
  }
  if (error instanceof GameError || error instanceof GameRuleError) {
    return { status: getHttpStatus(error), body: toWireError(error) };
  }
  const { status } = error as ParserError;
  if (status !== undefined && status >= StatusCodes.BAD_REQUEST && status < StatusCodes.INTERNAL_SERVER_ERROR) {
    const code = status === StatusCodes.FORBIDDEN ? "forbidden" : "invalid_message";
    return { status, body: { code, message: (error as Error).message } };
  }
  return { status: StatusCodes.INTERNAL_SERVER_ERROR, body: toWireError(error) };
}

const errorHandler = (error: unknown, req: Request, res: Response<ErrorResponse>, _next: NextFunction) => {
  const { status, body } = describeError(error);

  if (status >= StatusCodes.INTERNAL_SERVER_ERROR) {
    if (error instanceof AggregateError) {
      error.errors.forEach((inner) => logger.warn(inner.message));
    }
    logger.error("Request failed", { method: req.method, route: req.route?.path, error });
  } else {
    logger.debug("Request refused", { method: req.method, route: req.route?.path, status, code: body.code });
  }

  res.status(status).json({ error: body });
};

export default errorHandler;
