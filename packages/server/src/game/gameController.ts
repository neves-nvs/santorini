import * as gameRepository from "./gameRepository";
import * as gameService from "./gameService";

import { body, param } from "express-validator";
import { checkValidation, validateUUIDParam } from "../middlewares/middleware";

import { Router } from "express";
import { User } from "../model";
import { authenticate } from "../auth/authController";
import logger from "../logger";

const router = Router();

/* -------------------------------------------------------------------------- */
/*                                      /                                     */
/* -------------------------------------------------------------------------- */

router.get("/", authenticate, async (req, res) => {
  res.send(await gameRepository.getAllGames());
});

router.post(
  "/",
  authenticate,
  body("player_count").isInt({ min: 2, max: 4 }).withMessage("Amount of players must be between 2 and 4"),
  checkValidation,
  async (req, res, next) => {
    const { amountOfPlayers } = req.body as { amountOfPlayers: number | undefined };
    const user = req.user as User;

    try {
      const result = await gameService.createGame(user, amountOfPlayers);
      res.status(201).send(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Failed to create game") {
        logger.error("Failed to create game", error);
        return res.status(400).send({ message: "Failed to create game" });
      }
      logger.error("Failed to create game", error);
      next(error);
    }
  },
);

/* -------------------------------------------------------------------------- */
/*                              /:gameId/players                              */
/* -------------------------------------------------------------------------- */

router.post(
  "/:gameId/players",
  authenticate,
  param("gameId").isInt().withMessage("Game ID must be an integer"),
  checkValidation,
  async (req, res, next) => {
    const gameId = parseInt(req.params.gameId);
    const user = req.user as User;

    try {
      await gameService.addPlayerToGame(gameId, user);
      res.status(201).send();
    } catch (err) {
      if (!(err instanceof Error)) {
        next(err);
      }

      const error = err as Error;
      if (error.message === "Game not found") {
        logger.error("Game not found", error);
        return res.status(400).json({ message: "Game not found" });
      } else if (error.message.includes("duplicate key value violates unique constraint")) {
        logger.error("Player already in game", error);
        return res.status(400).json({ message: "Player already in game" });
      } else if (error.message === "Game is full") {
        logger.error("Game is full", error);
        return res.status(400).json({ message: "Game full" });
      }

      logger.error("Failed to add player to game", error);
      return res.status(400).json({ message: "Failed to add player to game" });
      // TODO implement remaining error handling
    }
  },
);

/* -------------------------------------------------------------------------- */
/*                               /:gameId/plays                               */
/* -------------------------------------------------------------------------- */

router.get("/:gameId/plays", authenticate, validateUUIDParam("gameId"), checkValidation, async (req, res) => {
  const gameId = parseInt(req.params.gameId);

  const user = req.user as User;

  const game = await gameRepository.findGameById(gameId);
  if (!game) {
    return res.status(400).send("Game not found");
  }

  // res.send(gameService.getPlays(user.username));

  res.status(501).send("Get plays not implemented");
});

router.post("/:gameId/plays", authenticate, validateUUIDParam("gameId"), checkValidation, async (req, res) => {
  const gameId = parseInt(req.params.gameId);

  const user = req.user as User;

  const { play } = req.body;
  if (!play) {
    return res.status(400).send("Play required");
  }

  const game = await gameRepository.findGameById(gameId);
  if (!game) {
    return res.status(400).send("Game not found");
  }

  // gameService.applyPlay(gameId, user.username, play);

  return res.status(501).send("Post plays not implemented");
  // game.addPlay(player.getUsername(), play);
  // res.status(201).send();
});

export default router;
