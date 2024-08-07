import { Router } from "express";
import { body } from "express-validator";
import logger from "../logger";
import {
  checkValidation,
  deprecate,
  validateUUIDParam,
} from "../utils/middleware";
import { findUserByUsername } from "../users/userRepository";
import { createGame, findGameById, getAllGamesIds } from "./gameRepository";

const router = Router();

router.get("/", async (req, res) => {
  res.send(await getAllGamesIds());
});

router.post(
  "/",
  body("username").isString().notEmpty().withMessage("Username is required"),
  body("amountOfPlayers")
    .isInt({ min: 2, max: 4 })
    .withMessage("Amount of players must be between 2 and 4"),
  async (req, res) => {
    const { username, amountOfPlayers } = req.body as {
      username: string;
      amountOfPlayers: number | undefined;
    };
    const game = await createGame({ username, amountOfPlayers });
    res.status(201).send({ gameId: game.getId() });
  },
);

// router.delete("/:gameId", (req, res) => {
//   const { gameId } = req.params;
// if (!uuidRegex.test(gameId)) {
//     return res.status(400).send("Invalid game ID");
// }

// check owner of game
// gameRepository.deleteGame(gameId);
// res.status(204).send();

//   logger.warn("DELETE /games/:gameId not implemented");
//   return res.status(501).send("Delete game not implemented");
// });

router.post(
  "/:gameId/players",
  deprecate,
  validateUUIDParam("gameId"),
  checkValidation,
  body("username").notEmpty().withMessage("Username is required"),
  async (req, res) => {
    const { gameId } = req.params;
    const { username } = req.body as { username: string };
    const game = await findGameById(gameId);
    if (!game) {
      return res.status(400).send("Game not found");
    }
    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(400).send("User not found");
    }

    game.addPlayer(user);
    res.status(201).send();
  },
);

router.post(
  "/join",
  deprecate,
  body("username").notEmpty().withMessage("Username is required"),
  body("gameID").isUUID().withMessage("Game ID must be a valid UUID"),
  checkValidation,
  async (req, res) => {
    logger.info("POST /games/join", req.body);
    const { username, gameID } = req.body;
    if (!gameID) {
      return res.status(400).send("Game ID required");
    }
    if (!username) {
      return res.status(400).send("Username required");
    }

    const game = await findGameById(gameID);
    if (!game) {
      return res.status(400).send("Game not found");
    }
    const user = findUserByUsername(username);
    if (!user) {
      return res.status(400).send("User not found");
    }

    // const success = game.addPlayer(user);
    // if (!success) {
    //   return res.status(400).send("Game full");
    // }

    if (game.isReadyToStart()) {
      game.start();
      const currentPlayer = game.getCurrentPlayer();
      console.assert(currentPlayer, "No current player");
      if (!currentPlayer) {
        return res.status(500).send("No current player");
      }
      game.updatePlays(currentPlayer.username);
    }

    res.status(201).send({ gameId: game.getId() });
  },
);

router.get(
  "/:gameId/plays",
  validateUUIDParam("gameId"),
  checkValidation,
  async (req, res) => {
    const { gameId } = req.params;
    // TODO should be available from the session
    const { playerId } = req.body;
    if (!playerId) {
      return res.status(400).send("Player ID required");
    }
    const player = await findUserByUsername(playerId);
    if (!player) {
      return res.status(400).send("Player not found");
    }
    const username = player.username;

    const game = await findGameById(gameId);
    if (!game) {
      return res.status(400).send("Game not found");
    }

    res.send(game.getPlays(username));
  },
);

router.get(
  "/plays",
  deprecate,
  body("gameID").isString().notEmpty().withMessage("Game ID required"),
  body("playerID").isString().notEmpty().withMessage("Player ID required"),
  checkValidation,
  async (req, res) => {
    logger.info("GET /games/plays", req.body);
    const { gameID, playerID } = req.body;
    const game = await findGameById(gameID);
    if (!game) {
      return res.status(400).send("Game not found");
    }
    const player = await findUserByUsername(playerID);
    if (!player) {
      return res.status(400).send("Player not found");
    }

    const moves = game.getPlays(player.username);
    res.send(moves);
  },
);

router.post(
  "/:gameId/plays",
  validateUUIDParam("gameId"),
  body("playerID").isString().notEmpty().withMessage("Player ID required"),
  checkValidation,
  async (req, res) => {
    const { gameId } = req.params;

    // TODO should be available from the session
    const { playerID, play } = req.body;
    const player = await findUserByUsername(playerID);
    if (!player) {
      return res.status(400).send("Player not found");
    }

    if (!play) {
      return res.status(400).send("Play required");
    }

    const game = await findGameById(gameId);
    if (!game) {
      return res.status(400).send("Game not found");
    }

    return res.status(501).send("Post plays not implemented");
    // game.addPlay(player.getUsername(), play);
    // res.status(201).send();
  },
);

router.post(
  "/plays",
  deprecate,
  body("gameID").isString().notEmpty().withMessage("Game ID required"),
  body("playerID").isString().notEmpty().withMessage("Player ID required"),
  body("play").isString().notEmpty().withMessage("Play required"),
  async (req, res) => {
    logger.info("POST /games/plays", req.body);
    const { gameID, playerID } = req.body;
    // const play = req.body.play;

    const game = await findGameById(gameID);
    if (!game) {
      return res.status(400).send("Game not found");
    }
    const player = await findUserByUsername(playerID);
    if (!player) {
      return res.status(400).send("Player not found");
    }

    res.status(201).send();
  },
);

export default router;
