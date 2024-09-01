import * as gameRepository from "./gameRepository";
import * as gameService from "./gameService";

import { checkValidation, validateUUIDParam } from "../middlewares/middleware";

import { Router } from "express";
import { User } from "../model";
import { authenticate } from "../auth/authController";
import { body } from "express-validator";

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
  body("amountOfPlayers").isInt({ min: 2, max: 4 }).withMessage("Amount of players must be between 2 and 4"),
  checkValidation,
  async (req, res, next) => {
    const { amountOfPlayers } = req.body as { amountOfPlayers: number | undefined };
    const user = req.user as User;

    try {
      const result = await gameService.createGame(user, amountOfPlayers);
      res.status(201).send(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Failed to create game") {
        return res.status(400).send({ message: "Failed to create game" });
      }
      next(error);
    }
  },
);

/* -------------------------------------------------------------------------- */
/*                              /:gameId/players                              */
/* -------------------------------------------------------------------------- */

router.post("/:gameId/players", authenticate, validateUUIDParam("gameId"), checkValidation, async (req, res, next) => {
  const gameId = parseInt(req.params.gameId);
  const user = req.user as User;

  try {
    await gameService.addPlayerToGame(gameId, user);
    res.status(201).send();
  } catch (error) {
    if (error instanceof Error && error.message === "Game not found") {
      return res.status(400).send("Game not found");
    }
    next(error);
  }
});

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
