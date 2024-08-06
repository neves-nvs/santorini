// TODO this should be the one with the routes
// the service should have the actual logic
// the repository should have the db logic
// the model should have the schema
// the dto should have the data transfer objects
// the interface should have the types
// the enum should have the enums

import { Router } from "express";
import { body } from "express-validator";
import logger from "../logger";
import { checkValidation, deprecate } from "../utils/middleware";
import userService from "./userService";
import { findUserByUsername } from "./userRepository";

export const router = Router();

router.get("/", async (req, res) => {
  try {
    // const usersDto = userService.getUsers();
    const users = userService.getUsers();
    return res.status(200).json(users);
  } catch (e: unknown) {
    const error = e as Error;
    logger.error(error.message);
    res.status(400).send(error.message);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = userService.getUserById(id);
    if (user === null || user === undefined) {
      return res.status(404).send("User not found");
    }
    res.json(user);
  } catch (e: unknown) {
    const error = e as Error;
    logger.error(error.message);
    res.status(400).send(error.message);
  }
});

router.post(
  "/",
  body("username").isString().notEmpty().withMessage("Username is required"),
  checkValidation,
  async (req, res) => {
    try {
      const { username } = req.body;
      const user = userService.createUser(username);
      res.status(201).json(user);
    } catch (e: unknown) {
      const error = e as Error;
      logger.error(error.message);
      res.status(400).send(error.message);
    }
  },
);

router.post(
  "/login",
  deprecate,
  body("username").isString().notEmpty().withMessage("Username is required"),
  checkValidation,
  async (req, res) => {
    const { username } = req.body;

    const user = findUserByUsername(username);
    if (!user) {
      logger.error("User not found");
      return res.status(400).send("User not found");
    }

    res.status(200).send("Login successful");
  },
);

export default router;
