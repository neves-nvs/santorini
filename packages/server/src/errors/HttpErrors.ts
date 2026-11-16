import { ErrorCode, WireError } from "@santorini/shared";
import { StatusCodes } from "http-status-codes";

/** Throw one of these from a route or middleware: the error middleware turns it into the `{ error }` response. */
export class HttpError extends Error {
  constructor(
    public readonly status: StatusCodes,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: WireError["details"],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized") {
    super(StatusCodes.UNAUTHORIZED, "unauthorized", message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden") {
    super(StatusCodes.FORBIDDEN, "forbidden", message);
  }
}

export class ValidationFailedError extends HttpError {
  constructor(issues: NonNullable<WireError["details"]>["issues"]) {
    super(StatusCodes.BAD_REQUEST, "validation_failed", issues.map((issue) => issue.message).join(", "), { issues });
  }
}

export class UserExistsError extends HttpError {
  constructor() {
    super(StatusCodes.CONFLICT, "user_exists", "User already exists");
  }
}

export class UserNotFoundError extends HttpError {
  constructor() {
    super(StatusCodes.NOT_FOUND, "user_not_found", "User not found");
  }
}

export class RateLimitedError extends HttpError {
  constructor() {
    super(StatusCodes.TOO_MANY_REQUESTS, "rate_limited", "Too many requests");
  }
}
