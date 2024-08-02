import { Router } from "express";
import { gameRepository } from "../game/gameRepository";
import logger from "../logger";
import { userRepository } from "../users/userRepository";

const router = Router();

router.get("/", (req, res) => {
    res.send(gameRepository.getGamesIds());
});

router.post("/", (req, res) => {
    const { username, amountOfPlayers } = req.body as { username: string, amountOfPlayers: number | undefined };
    const game = gameRepository.createGame({ username, amountOfPlayers });
    res.status(201).send({ gameId: game.getId() });
});

router.delete("/:gameId", (req, res) => {
    // const { gameId } = req.params;
    // check owner of game
    // gameRepository.deleteGame(gameId);
    // res.status(204).send();
});

router.post("/join", (req, res) => {
    logger.info("POST /games/join", req.body);
    const { username, gameID } = req.body;
    if (!gameID) { return res.status(400).send("Game ID required"); }
    if (!username) { return res.status(400).send("Username required"); }

    const game = gameRepository.getGame(gameID);
    if (!game) { return res.status(400).send("Game not found"); }
    const user = userRepository.getUser(username);
    if (!user) { return res.status(400).send("User not found"); }

    const success = game.addPlayer(user)
    if (!success) { return res.status(400).send("Game full"); }

    if (game.isReadyToStart()) {
        game.start();
        const currentPlayer = game.getCurrentPlayer();
        console.assert(currentPlayer, "No current player");
        if (!currentPlayer) {
            return res.status(500).send("No current player");
        }
        game.updatePlays(currentPlayer.getUsername());
    }

    res.status(201).send({ gameId: game.getId() });
});

router.get("/plays", (req, res) => {
    logger.info("GET /games/plays", req.body);
    const { gameID, playerID } = req.body;
    if (!gameID) { return res.status(400).send("Game ID required"); }
    if (!playerID) { return res.status(400).send("Player ID required"); }

    const game = gameRepository.getGame(gameID);
    if (!game) { return res.status(400).send("Game not found"); }
    const player = userRepository.getUser(playerID);
    if (!player) { return res.status(400).send("Player not found"); }

    const moves = game.getPlays(player.getUsername());
    res.send(moves);
});

router.post("/plays", (req, res) => {
    logger.info("POST /games/plays", req.body);
    const { gameID, playerID, play } = req.body;
    if (!gameID) { return res.status(400).send("Game ID required"); }
    if (!playerID) { return res.status(400).send("Player ID required"); }
    if (!play) { return res.status(400).send("Play required"); }

    const game = gameRepository.getGame(gameID);
    if (!game) { return res.status(400).send("Game not found"); }
    const player = userRepository.getUser(playerID);
    if (!player) { return res.status(400).send("Player not found"); }

    res.status(201).send();
});

export default router;
