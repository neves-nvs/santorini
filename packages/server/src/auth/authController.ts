import { NextFunction, Request, Response, Router } from "express";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";

import { JWT_SECRET } from "../configs/config";
import { StatusCodes } from "http-status-codes";
import { User } from "../model";

import bcrypt from "bcryptjs";
import { body } from "express-validator";
import { checkValidation } from "../middlewares/middleware";
import { findUserByUsername } from "../users/userRepository";
import logger from "../logger";
import passport from "passport";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate("jwt", { session: false }, async (err: Error, user: unknown, info: VerifyErrors) => {
    if (info && info.message === "No auth token") {
      logger.debug("No auth token");
      return res.status(401).json({ message: "Unauthorized" });
    } else if (info) {
      // Reduce spam for common token expiration errors
      if (info.name === "TokenExpiredError") {
        logger.debug("Token expired", info.message);
      } else {
        logger.error("Forbidden", info);
      }
      return res.status(403).json({ message: "Forbidden" });
    } else if (err) {
      logger.error("Unauthorized", err);
      return res.status(401).json({ message: "Unauthorized" });
    } else if (!user) {
      logger.debug("No user found");
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validUser = await findUserByUsername((user as JwtPayload).username);
      logger.debug(`Checked if user exists: ${JSON.stringify(validUser)}`);
      if (!validUser) {
        return res.status(403).json({ message: "User not found or inactive" });
      }

      req.user = validUser;

      next();
    } catch (e: unknown) {
      return res.status(500).json({ message: "Internal server error", error: e });
    }
  })(req, res, next);
};

const router = Router();

router.post(
  "/session",
  body("username").isString().notEmpty().withMessage("Username is required"),
  body("password").isString().notEmpty().withMessage("Password is required"),
  checkValidation,
  async (req: Request, res: Response) => {
    const { username, password } = req.body;

    try {
      const user = await findUserByUsername(username);
      logger.debug(`Checked if user exists: ${JSON.stringify(user?.username)}`);
      logger.warn(JSON.stringify(user));
      if (!user) {
        logger.error("User not found");
        return res.status(400).json({ message: "User not found" });
      }

      if (!user.password_hash) {
        logger.error("User has no password set");
        return res.status(StatusCodes.UNAUTHORIZED).json({ message: "User has no password set" });
      }

      if (!(await bcrypt.compare(password, user.password_hash))) {
        logger.error("Invalid password");
        return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid password" });
      }

      if (!JWT_SECRET) {
        logger.error("JWT secret not set");
        return res.status(500).send("JWT secret not set");
      }

      const token = jwt.sign({ username: user.username }, JWT_SECRET, {
        expiresIn: "5h",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        domain: "localhost"
      });
      res.status(200).send("OK");
    } catch (err) {
      logger.error("An error occurred during authentication", err);
      res.status(500).send("Internal server error");
    }
  },
);

// Logout endpoint to clear the authentication cookie
router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    domain: "localhost"
  });
  res.status(200).json({ message: "Logged out successfully" });
});

router.get(
  "/auth/google",
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
  }),
);

router.get("/auth/google/callback", passport.authenticate("google", { session: false }), (req, res) => {
  const user = req.user as User;

  if (!JWT_SECRET) {
    logger.error("JWT secret not set");
    return res.status(500).send("JWT secret not set");
  }

  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "5h" });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  res.redirect("http://localhost:5173");
});

// Endpoint to get JWT token for WebSocket authentication
router.get("/token", authenticate, async (req, res) => {
  try {
    const user = req.user as User;
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "5h",
    });
    res.status(200).json({ token });
  } catch (e: unknown) {
    const error = e as Error;
    logger.error(error.message);
    res.status(400).send(error.message);
  }
});

// Endpoint to check authentication status and get user info
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = req.user as User;
    res.status(200).json({ username: user.username });
  } catch (e: unknown) {
    const error = e as Error;
    logger.error(error.message);
    res.status(400).send(error.message);
  }
});

// Test endpoint for authentication testing
router.get("/test-auth", authenticate, async (req, res) => {
  try {
    const user = req.user as User;
    res.status(200).json({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      created_at: user.created_at
    });
  } catch (e: unknown) {
    const error = e as Error;
    logger.error(error.message);
    res.status(400).send(error.message);
  }
});

export default router;
