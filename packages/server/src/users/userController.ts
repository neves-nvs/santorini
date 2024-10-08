import { body, param } from "express-validator";
import { createUser, findAllUsers, findUserByUsername } from "./userRepository";

import { NewUser } from "../model";
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { UserDTO } from "./userDTO";
import bcrypt from "bcryptjs";
import { checkValidation } from "../middlewares/middleware";
import logger from "../logger";

export const router = Router();

router.get("/", async (req, res) => {
  try {
    const users = await findAllUsers();
    return res.status(200).json(users);
  } catch (e: unknown) {
    const error = e as Error;
    logger.error(error.message);
    res.status(400).send(error.message);
  }
});

router.post(
  "/",
  body("username").isString().notEmpty().withMessage("Username is required"),
  body("password").isString().notEmpty().withMessage("Password is required"),
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
        res.status(500).send(e.message);
      } else {
        logger.error("Unknown error", { error: e });
        return res.status(500).json({ message: "Unknown error occurred" });
      }
    }
  },
);

router.get(
  "/:username",
  param("username").isString().notEmpty().withMessage("Username is required"),
  checkValidation,
  async (req, res) => {
    try {
      const { username } = req.params;
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
        res.status(500).send(e.message);
      } else {
        logger.error("Unknown error", { error: e });
        return res.status(500).json({ message: "Unknown error occurred" });
      }
    }
  },
);

export default router;
