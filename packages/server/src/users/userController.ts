import { CreateUserRequest, MessageResponse, TextResponse, UserView, ValidationErrorResponse } from "@santorini/shared";
import { NextFunction, Request, Response, Router } from "express";
import { body, param } from "express-validator";
import { createUser, findAllUsers, findUserByUsername } from "./userRepository.ts";

import { NewUser } from "@/model.ts";
import { StatusCodes } from "http-status-codes";
import { UserDTO } from "./userDTO.ts";
import { authRateLimitMiddleware } from "@/middlewares/authRateLimitMiddleware.ts";
import { authenticate } from "@/auth/authController.ts";
import bcrypt from "bcryptjs";
import { checkValidation } from "@/middlewares/middleware.ts";
import { config } from "@/configs/config.ts";
import logger from "@/logger.ts";

const router = Router();

type NoParams = Record<string, string>;

const MIN_PASSWORD_LENGTH = 8;

const requireRegistrationEnabled = (_req: Request, res: Response, next: NextFunction) => {
  if (!config.registrationEnabled) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Registration is disabled" });
  }
  next();
};

router.get<NoParams, UserView[] | MessageResponse>("/", authenticate, async (_req, res) => {
  try {
    const users = await findAllUsers();
    return res.status(200).json(users.map((user) => new UserDTO(user)));
  } catch (e: unknown) {
    logger.error((e as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post<NoParams, UserView | TextResponse | MessageResponse | ValidationErrorResponse, CreateUserRequest>(
  "/",
  authRateLimitMiddleware,
  requireRegistrationEnabled,
  body("username").isString().notEmpty().withMessage("Username is required"),
  body("password")
    .isString()
    .withMessage("Password is required")
    .isLength({ min: MIN_PASSWORD_LENGTH })
    .withMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
  checkValidation,
  async (req, res) => {
    const { username, password } = req.body;

    try {
      const user = await findUserByUsername(username);

      if (user) {
        logger.error("User already exists");
        return res.status(StatusCodes.CONFLICT).json({
          message: "User already exists",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      const newUser = {
        username,
        display_name: `${username}-${Date.now()}`,
        password_hash: hash,
        password_salt: salt,
        created_at: new Date().toISOString(),
      } as NewUser;

      const createdUser = await createUser(newUser);

      const userDTO = new UserDTO(createdUser);

      res.status(StatusCodes.CREATED).json(userDTO);
    } catch (e: unknown) {
      if (e instanceof AggregateError) {
        e.errors.forEach((error) => {
          logger.warn(error.message);
        });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Database connection error");
      } else if (e instanceof Error) {
        logger.error(e.message);
        res.status(500).send("Internal server error");
      } else {
        logger.error("Unknown error", { error: e });
        return res.status(500).json({ message: "Unknown error occurred" });
      }
    }
  },
);

router.get<{ username: string }, UserView | TextResponse | MessageResponse | ValidationErrorResponse>(
  "/:username",
  param("username").isString().notEmpty().withMessage("Username is required"),
  checkValidation,
  async (req, res) => {
    try {
      const username = String(req.params.username);
      const user = await findUserByUsername(username);
      if (user === null || user === undefined) {
        return res.status(404).json({ message: "User not found" });
      }
      const userDTO = new UserDTO(user);
      res.json(userDTO);
    } catch (e: unknown) {
      if (e instanceof AggregateError) {
        e.errors.forEach((error) => {
          logger.warn(error.message);
        });
        res.status(409).send("Database connection error");
      } else if (e instanceof Error) {
        logger.error(e.message);
        res.status(500).send("Internal server error");
      } else {
        logger.error("Unknown error", { error: e });
        return res.status(500).json({ message: "Unknown error occurred" });
      }
    }
  },
);

export default router;
