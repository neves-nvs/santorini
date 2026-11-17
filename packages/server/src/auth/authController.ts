import { CookieOptions, NextFunction, Request, Response, Router } from "express";
import {
  CurrentUserResponse,
  ErrorResponse,
  LoginRequest,
  LogoutResponse,
  TextResponse,
  WebSocketTicketResponse,
} from "@santorini/shared";
import { ForbiddenError, UnauthorizedError } from "@/errors/HttpErrors.ts";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { User } from "@/model.ts";
import bcrypt from "bcryptjs";
import { body } from "express-validator";
import { checkValidation } from "@/middlewares/middleware.ts";
import { config } from "@/configs/config.ts";
import { findUserByUsername } from "@/users/userRepository.ts";
import logger from "@/logger.ts";
import { loginRateLimitMiddleware } from "@/middlewares/authRateLimitMiddleware.ts";
import passport from "passport";
import { randomBytes } from "crypto";
import { webSocketTickets } from "./webSocketTickets.ts";

// Compared against when there is no hash to check, so an unknown user takes as long as a wrong password.
const UNUSED_PASSWORD_HASH = bcrypt.hashSync(randomBytes(16).toString("hex"), 10);

function sessionCookieOptions(req: Request): CookieOptions {
  return { httpOnly: true, secure: req.secure, sameSite: "lax", path: "/" };
}

/**
 * Get authenticated user from request. Only call after authenticate middleware.
 */
export function getUser(req: Request): User {
  return req.user as User;
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate("jwt", { session: false }, async (err: Error, user: unknown, info: VerifyErrors) => {
    if (info && info.message === "No auth token") {
      logger.debug("No auth token");
      return next(new UnauthorizedError());
    } else if (info) {
      // Reduce spam for common token expiration errors
      if (info.name === "TokenExpiredError") {
        logger.debug("Token expired", info.message);
      } else {
        logger.error("Forbidden", info);
      }
      return next(new ForbiddenError());
    } else if (err) {
      logger.error("Unauthorized", err);
      return next(new UnauthorizedError());
    } else if (!user) {
      logger.debug("No user found");
      return next(new UnauthorizedError());
    }

    try {
      const validUser = await findUserByUsername((user as JwtPayload).username);
      logger.debug("Checked if user exists", { user: validUser });
      if (!validUser) {
        return next(new ForbiddenError("User not found or inactive"));
      }

      req.user = validUser;

      next();
    } catch (e: unknown) {
      next(e);
    }
  })(req, res, next);
};

const router = Router();

type NoParams = Record<string, string>;

router.post<NoParams, TextResponse | ErrorResponse, LoginRequest>(
  "/session",
  loginRateLimitMiddleware,
  body("username")
    .isString()
    .withMessage("Username is required")
    .bail()
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage("Username is required"),
  body("password").isString().notEmpty().withMessage("Password is required"),
  checkValidation,
  async (req: Request, res: Response) => {
    const { username, password } = req.body;

    const user = await findUserByUsername(username);
    const passwordHash = user?.password_hash;
    const passwordMatches = await bcrypt.compare(password, passwordHash ?? UNUSED_PASSWORD_HASH);
    if (!user || !passwordHash || !passwordMatches) {
      logger.warn("Login rejected", { reason: user ? "invalid password" : "unknown user" });
      throw new UnauthorizedError("Invalid username or password");
    }

    if (!config.jwtSecret) {
      throw new Error("JWT secret not set");
    }

    const token = jwt.sign({ username: user.username }, config.jwtSecret, {
      expiresIn: "5h",
    });

    res.cookie("token", token, sessionCookieOptions(req));
    res.status(StatusCodes.OK).send("OK");
  },
);

// Logout endpoint to clear the authentication cookie
router.post<NoParams, LogoutResponse>("/logout", (req, res) => {
  res.clearCookie("token", sessionCookieOptions(req));
  res.status(StatusCodes.OK).json({ message: "Logged out successfully" });
});

// A one-time ticket for opening a WebSocket from a browser, which cannot set headers on the handshake
router.post<NoParams, WebSocketTicketResponse>("/ws-ticket", authenticate, (req, res) => {
  res.status(StatusCodes.OK).json({ ticket: webSocketTickets.issue(getUser(req).username) });
});

// Endpoint to check authentication status and get user info
router.get<NoParams, CurrentUserResponse | ErrorResponse>("/me", authenticate, (req, res) => {
  const user = getUser(req);
  res.status(StatusCodes.OK).json({ id: user.id, username: user.username });
});

export default router;
