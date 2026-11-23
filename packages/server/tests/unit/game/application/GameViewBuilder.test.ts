import { asGameId, asSeat, asUserId, Game, Player } from "@santorini/engine";
import { CompletedGameView, GameView, InProgressGameView, WaitingGameView } from "@santorini/shared";

import { GameViewBuilder } from "@/game/application/GameViewBuilder.ts";

const CURRENT_USER = asUserId(100);
const WAITING_USER = asUserId(101);
const OUTSIDER = asUserId(999);
const buildView = (game: Game, userId: typeof CURRENT_USER) => {
  const usernames = new Map(game.players.map((player) => [player.userId, `user-${player.userId}`] as const));
  return new GameViewBuilder().buildFor(game, userId, new Set<typeof CURRENT_USER>(), usernames);
};

function startedGame(): Game {
  const game = Game.create(asGameId(1), CURRENT_USER, 2);
  game.addPlayer(new Player(CURRENT_USER));
  game.addPlayer(new Player(WAITING_USER));
  game.players.forEach((_, seat) => game.setPlayerReady(asSeat(seat), true));
  return game;
}

function finishedGame(): Game {
  return Game.fromSnapshot({
    ...startedGame().toSnapshot(),
    status: "completed",
    winnerUserId: WAITING_USER,
    winReason: "win_condition",
  });
}

describe("GameViewBuilder viewer", () => {
  it("gives the available moves to the player whose turn it is", () => {
    const { viewer } = buildView(startedGame(), CURRENT_USER);

    expect(viewer).toMatchObject({ role: "player", isCurrentPlayer: true });
    expect(viewer.role === "player" && viewer.availableMoves.length).toBeGreaterThan(0);
  });

  it("gives a player whose turn it is not an empty list of moves", () => {
    const { viewer } = buildView(startedGame(), WAITING_USER);

    expect(viewer).toEqual({ role: "player", isCurrentPlayer: false, availableMoves: [] });
  });

  it("shows a user who is not in the game as a spectator, with no moves", () => {
    const { viewer } = buildView(startedGame(), OUTSIDER);

    expect(viewer).toEqual({ role: "spectator" });
  });
});

describe("GameViewBuilder game", () => {
  it("names the game limits and has no winner while the game is on", () => {
    const view = buildView(startedGame(), CURRENT_USER);

    expect(view).toMatchObject({
      gameId: 1,
      status: "in-progress",
      maxPlayers: 2,
      winnerUserId: null,
      winReason: null,
    });
    expect(view.players.map((player) => player.userId)).toEqual([CURRENT_USER, WAITING_USER]);
  });

  it("is the same game for everyone, whoever looks", () => {
    const game = startedGame();

    const sameGame = (view: GameView) => ({ ...view, viewer: undefined });

    expect(sameGame(buildView(game, OUTSIDER))).toEqual(sameGame(buildView(game, CURRENT_USER)));
  });
});

describe("GameViewBuilder game lifecycle", () => {
  it("shows a game still waiting for players with no phase, current player or winner", () => {
    const view = buildView(Game.create(asGameId(1), CURRENT_USER, 2), CURRENT_USER);

    expect(view).toMatchObject({
      status: "waiting",
      phase: null,
      currentSeat: null,
      winnerUserId: null,
      winReason: null,
    });
  });

  it("shows a game in progress with its phase and current player", () => {
    const view = buildView(startedGame(), CURRENT_USER);

    expect(view).toMatchObject({
      status: "in-progress",
      phase: "placing",
      currentSeat: 0,
      winnerUserId: null,
      winReason: null,
    });
  });

  it("shows a finished game with its winner and reason, and nobody to move", () => {
    const view = buildView(finishedGame(), CURRENT_USER);

    expect(view).toMatchObject({
      status: "completed",
      phase: null,
      currentSeat: null,
      winnerUserId: WAITING_USER,
      winReason: "win_condition",
    });
  });
});

describe("GameView type", () => {
  it("has no representation for a game that contradicts its status", () => {
    const view = buildView(startedGame(), CURRENT_USER);
    const { viewer, board, players } = view;
    const common = { gameId: 1, maxPlayers: 2, turnNumber: 0, version: 1, board, players, viewer };

    const waiting: WaitingGameView = {
      ...common,
      status: "waiting",
      phase: null,
      currentSeat: null,
      winnerUserId: null,
      winReason: null,
    };
    // @ts-expect-error a waiting game has no winner
    const waitingWithWinner: WaitingGameView = { ...waiting, winnerUserId: 1 };
    const inProgress: InProgressGameView = {
      ...waiting,
      status: "in-progress",
      phase: "placing",
      currentSeat: 0,
    };
    // @ts-expect-error a game in progress has a phase
    const inProgressWithoutPhase: InProgressGameView = { ...inProgress, phase: null };
    const completed: CompletedGameView = {
      ...waiting,
      status: "completed",
      winnerUserId: 1,
      winReason: "win_condition",
    };
    // @ts-expect-error a finished game has a reason
    const completedWithoutReason: CompletedGameView = { ...completed, winReason: null };

    expect([waiting, waitingWithWinner, inProgressWithoutPhase, completedWithoutReason]).toHaveLength(4);
  });
});
