import { NextFunction, Request, Response, Router } from "express";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";

import { JWT_SECRET } from "../configs/config";
import { StatusCodes } from "http-status-codes";
import { User } from "../model";
import { UserDTO } from "../users/userDTO";
import bcrypt from "bcryptjs";
import { body } from "express-validator";
import { checkValidation } from "../middlewares/middleware";
import { findUserByUsername } from "../users/userRepository";
import logger from "../logger";
import passport from "passport";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate("jwt", { session: false }, async (err: Error, user: unknown, info: VerifyErrors) => {
    if (info && info.message === "No auth token") {
      logger.error("No auth token");
      return res.status(401).json({ message: "Unauthorized" });
    } else if (info) {
      logger.error("Forbidden", info);
      return res.status(403).json({ message: "Forbidden" });
    } else if (err) {
      logger.error("Unauthorized", err);
      return res.status(401).json({ message: "Unauthorized" });
    } else if (!user) {
      logger.error("Unauthorized");
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
        // sameSite: 'Strict',
        sameSite: "none",
      });
      res.status(200).send("OK");
    } catch (err) {
      logger.error("An error occurred during authentication", err);
      res.status(500).send("Internal server error");
    }
  },
);

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

router.get("/test-auth", authenticate, async (req, res) => {
  try {
    logger.info("User authenticated", new UserDTO(req.user as User));
    res.status(200).send(req.user);
  } catch (e: unknown) {
    const error = e as Error;
    logger.error(error.message);
    res.status(400).send(error.message);
  }
});

export default router;
