import { CreateUserRequest, ErrorResponse, UserView } from "@santorini/shared";
import { NextFunction, Request, Response, Router } from "express";
import { body, param } from "express-validator";
import { createUser, findUserByUsername } from "./userRepository.ts";

import { NewUser } from "@/model.ts";
import { StatusCodes } from "http-status-codes";
import { UserDTO } from "./userDTO.ts";
import bcrypt from "bcryptjs";
import { checkValidation } from "@/middlewares/middleware.ts";
import { config } from "@/configs/config.ts";
import logger from "@/logger.ts";
import { registrationRateLimitMiddleware } from "@/middlewares/authRateLimitMiddleware.ts";
import { sendError } from "@/errors/httpError.ts";

const router = Router();

type NoParams = Record<string, string>;

const MIN_PASSWORD_LENGTH = 8;

function respondWithUnexpectedError(res: Response<ErrorResponse>, e: unknown) {
  if (e instanceof AggregateError) {
    e.errors.forEach((error) => logger.warn(error.message));
  } else if (e instanceof Error) {
    logger.error(e.message);
  } else {
    logger.error("Unknown error", { error: e });
  }
  sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, "internal", "Internal server error");
}

const requireRegistrationEnabled = (_req: Request, res: Response, next: NextFunction) => {
  if (!config.registrationEnabled) {
    return sendError(res, StatusCodes.FORBIDDEN, "forbidden", "Registration is disabled");
  }
  next();
};

router.post<NoParams, UserView | ErrorResponse, CreateUserRequest>(
  "/",
  registrationRateLimitMiddleware,
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
        return sendError(res, StatusCodes.CONFLICT, "user_exists", "User already exists");
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
      respondWithUnexpectedError(res, e);
    }
  },
);

router.get<{ username: string }, UserView | ErrorResponse>(
  "/:username",
  param("username").isString().notEmpty().withMessage("Username is required"),
  checkValidation,
  async (req, res) => {
    try {
      const username = String(req.params.username);
      const user = await findUserByUsername(username);
      if (user === null || user === undefined) {
        return sendError(res, 404, "user_not_found", "User not found");
      }
      const userDTO = new UserDTO(user);
      res.json(userDTO);
    } catch (e: unknown) {
      respondWithUnexpectedError(res, e);
    }
  },
);

export default router;
