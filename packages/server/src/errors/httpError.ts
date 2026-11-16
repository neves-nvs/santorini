import { ErrorCode, ErrorResponse, WireError } from "@santorini/shared";
import { Response } from "express";

export const RATE_LIMITED_RESPONSE: ErrorResponse = {
  error: { code: "rate_limited", message: "Too many requests" },
};

export function sendError(
  res: Response<ErrorResponse>,
  status: number,
  code: ErrorCode,
  message: string,
  details?: WireError["details"],
) {
  return res.status(status).json({ error: { code, message, details } });
}
