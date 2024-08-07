// TODO this should be the one with the routes
// the service should have the actual logic
// the repository should have the db logic
// the model should have the schema
// the dto should have the data transfer objects
// the interface should have the types
// the enum should have the enums

import { Router } from "express";
import { body, param } from "express-validator";
import logger from "../logger";
import { checkValidation, deprecate } from "../utils/middleware";
import { createUser, findAllUsers, findUserByUsername } from "./userRepository";
import { NewUser } from "../model";

export const router = Router();

router.get("/", async (req, res) => {
  try {
    const users = findAllUsers();
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
    try {
      const { username, password } = req.body;
      const displayName = `${username}-${Date.now()}`;

      const newUser = {
        username,
        password,
        display_name: displayName,
      } as NewUser;

      const user = createUser(newUser);
      res.status(201).json(user);
    } catch (e: unknown) {
      const error = e as Error;
      logger.error(error.message);
      res.status(400).send(error.message);
    }
  },
);

/* -------------------------------------------------------------------------- */
/*                                  :username                                 */
/* -------------------------------------------------------------------------- */

router.get(
  "/:username",
  param("username").isString().notEmpty().withMessage("Username is required"),
  checkValidation,
  async (req, res) => {
    try {
      const { username } = req.params;
      const user = findUserByUsername(username);
      if (user === null || user === undefined) {
        return res.status(404).send("User not found");
      }
      res.json(user);
    } catch (e: unknown) {
      const error = e as Error;
      logger.error(error.message);
      res.status(400).send(error.message);
    }
  },
);

export default router;
