import { asGameId, asPlayerId, asUserId, Game, Player } from "@santorini/engine";
import { CompletedGameView, GameView, InProgressGameView, WaitingGameView } from "@santorini/shared";

import { GameViewBuilder } from "@/game/application/GameViewBuilder.ts";

const CURRENT_USER = asUserId(100);
const WAITING_USER = asUserId(101);
const OUTSIDER = asUserId(999);

function startedGame(): Game {
  const game = Game.create(asGameId(1), CURRENT_USER, 2);
  game.addPlayer(new Player(asPlayerId(1), CURRENT_USER, 0));
  game.addPlayer(new Player(asPlayerId(2), WAITING_USER, 1));
  for (const [playerId] of game.players) {
    game.setPlayerReady(playerId, true);
  }
  return game;
}

function finishedGame(overrides: { winnerId?: number | null; winReason?: string | null } = {}): Game {
  const snapshot = startedGame().toSnapshot();
  return Game.fromSnapshot({
    ...snapshot,
    status: "completed",
    winnerId: overrides.winnerId === undefined ? asPlayerId(2) : (overrides.winnerId as never),
    winReason: overrides.winReason === undefined ? "win_condition" : overrides.winReason,
  });
}

describe("GameViewBuilder viewer", () => {
  const builder = new GameViewBuilder();

  it("gives the available moves to the player whose turn it is", () => {
    const { viewer } = builder.buildFor(startedGame(), CURRENT_USER);

    expect(viewer).toMatchObject({ role: "player", playerId: 1, isCurrentPlayer: true });
    expect(viewer.role === "player" && viewer.availableMoves.length).toBeGreaterThan(0);
  });

  it("gives a player whose turn it is not an empty list of moves", () => {
    const { viewer } = builder.buildFor(startedGame(), WAITING_USER);

    expect(viewer).toEqual({ role: "player", playerId: 2, isCurrentPlayer: false, availableMoves: [] });
  });

  it("shows a user who is not in the game as a spectator, with no moves", () => {
    const { viewer } = builder.buildFor(startedGame(), OUTSIDER);

    expect(viewer).toEqual({ role: "spectator" });
  });
});

describe("GameViewBuilder game", () => {
  const builder = new GameViewBuilder();

  it("names the game limits and has no winner while the game is on", () => {
    const view = builder.buildFor(startedGame(), CURRENT_USER);

    expect(view).toMatchObject({
      gameId: 1,
      status: "in-progress",
      maxPlayers: 2,
      winnerPlayerId: null,
      winReason: null,
    });
    expect(view.players.map((player) => player.userId)).toEqual([CURRENT_USER, WAITING_USER]);
  });

  it("is the same game for everyone, whoever looks", () => {
    const game = startedGame();

    const sameGame = (view: GameView) => ({ ...view, viewer: undefined });

    expect(sameGame(builder.buildFor(game, OUTSIDER))).toEqual(sameGame(builder.buildFor(game, CURRENT_USER)));
  });
});

describe("GameViewBuilder game lifecycle", () => {
  const builder = new GameViewBuilder();

  it("shows a game still waiting for players with no phase, current player or winner", () => {
    const view = builder.buildFor(Game.create(asGameId(1), CURRENT_USER, 2), CURRENT_USER);

    expect(view).toMatchObject({
      status: "waiting",
      phase: null,
      currentPlayerId: null,
      winnerPlayerId: null,
      winReason: null,
    });
  });

  it("shows a game in progress with its phase and current player", () => {
    const view = builder.buildFor(startedGame(), CURRENT_USER);

    expect(view).toMatchObject({
      status: "in-progress",
      phase: "placing",
      currentPlayerId: 1,
      winnerPlayerId: null,
      winReason: null,
    });
  });

  it("shows a finished game with its winner and reason, and nobody to move", () => {
    const view = builder.buildFor(finishedGame(), CURRENT_USER);

    expect(view).toMatchObject({
      status: "completed",
      phase: null,
      currentPlayerId: null,
      winnerPlayerId: 2,
      winReason: "win_condition",
    });
  });

  it("refuses to show a finished game that has no winner", () => {
    expect(() => builder.buildFor(finishedGame({ winnerId: null }), CURRENT_USER)).toThrow(/no winner/);
  });

  it("refuses to show a finished game with an unknown win reason", () => {
    expect(() => builder.buildFor(finishedGame({ winReason: "teleport" }), CURRENT_USER)).toThrow(/win reason/);
  });
});

describe("GameView type", () => {
  it("has no representation for a game that contradicts its status", () => {
    const view = new GameViewBuilder().buildFor(startedGame(), CURRENT_USER);
    const { viewer, board, players } = view;
    const common = { gameId: 1, maxPlayers: 2, turnNumber: 0, version: 1, board, players, viewer };

    const waiting: WaitingGameView = {
      ...common,
      status: "waiting",
      phase: null,
      currentPlayerId: null,
      winnerPlayerId: null,
      winReason: null,
    };
    // @ts-expect-error a waiting game has no winner
    const waitingWithWinner: WaitingGameView = { ...waiting, winnerPlayerId: 1 };
    const inProgress: InProgressGameView = {
      ...waiting,
      status: "in-progress",
      phase: "placing",
      currentPlayerId: 1,
    };
    // @ts-expect-error a game in progress has a phase
    const inProgressWithoutPhase: InProgressGameView = { ...inProgress, phase: null };
    const completed: CompletedGameView = {
      ...waiting,
      status: "completed",
      winnerPlayerId: 1,
      winReason: "win_condition",
    };
    // @ts-expect-error a finished game has a reason
    const completedWithoutReason: CompletedGameView = { ...completed, winReason: null };

    expect([waiting, waitingWithWinner, inProgressWithoutPhase, completedWithoutReason]).toHaveLength(4);
  });
});
