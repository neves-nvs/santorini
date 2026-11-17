import {
  CreateUserRequest,
  ErrorResponse,
  UserView,
  createUserRequestSchema,
  usernameParamsSchema,
} from "@santorini/shared";
import { ForbiddenError, UserExistsError, UserNotFoundError } from "@/errors/HttpErrors.ts";
import { NextFunction, Request, Response, Router } from "express";
import { createUser, findUserByUsername } from "./userRepository.ts";
import { parseRequest, validateBody } from "@/middlewares/middleware.ts";

import { NewUser } from "@/model.ts";
import { StatusCodes } from "http-status-codes";
import { UserDTO } from "./userDTO.ts";
import { authenticate } from "@/auth/authController.ts";
import bcrypt from "bcryptjs";
import { config } from "@/configs/config.ts";
import { registrationRateLimitMiddleware } from "@/middlewares/authRateLimitMiddleware.ts";

const router = Router();

type NoParams = Record<string, string>;

const requireRegistrationEnabled = (_req: Request, _res: Response, next: NextFunction) => {
  if (!config.registrationEnabled) {
    throw new ForbiddenError("Registration is disabled");
  }
  next();
};

router.post<NoParams, UserView | ErrorResponse, CreateUserRequest>(
  "/",
  registrationRateLimitMiddleware,
  requireRegistrationEnabled,
  validateBody(createUserRequestSchema),
  async (req, res) => {
    const { username, password } = req.body;

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
    if (!createdUser) {
      throw new UserExistsError();
    }

    res.status(StatusCodes.CREATED).json(new UserDTO(createdUser));
  },
);

router.get<{ username: string }, UserView | ErrorResponse>("/:username", authenticate, async (req, res) => {
  const { username } = parseRequest(usernameParamsSchema, req.params);
  const user = await findUserByUsername(username);
  if (!user) {
    throw new UserNotFoundError();
  }
  res.json(new UserDTO(user));
});

export default router;
