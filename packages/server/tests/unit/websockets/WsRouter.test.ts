import { asGameId, GameRuleError } from "@santorini/engine";
import { ServerMessage } from "@santorini/shared";

import { GameNotFoundError } from "@/errors/GameErrors.ts";
import { GameService } from "@/game/application/GameService.ts";
import { Connection } from "@/game/infra/Connection.ts";
import { ConnectionManager } from "@/game/infra/ConnectionManager.ts";
import { WsRouter } from "@/websockets/WsRouter.ts";

function setup() {
  const sent: ServerMessage[] = [];
  const connection: Connection = {
    user: { id: 1, username: "ana" } as Connection["user"],
    isOpen: true,
    send: (message) => sent.push(message),
  };
  const gameService = {
    addPlayer: vi.fn(async () => ({ game: { id: 7, players: new Map(), maxPlayers: 2 } })),
    getGameView: vi.fn(async () => ({})),
    setPlayerReady: vi.fn(),
    applyMove: vi.fn(),
  };
  const router = new WsRouter(gameService as unknown as GameService, new ConnectionManager());
  const handle = (frame: unknown) => router.handleMessage(connection, JSON.stringify(frame));
  return { sent, handle, gameService, router, connection };
}

const invalidFrame = { type: "error", payload: { code: "invalid_message", message: "Invalid message format" } };

describe("WsRouter input validation", () => {
  test.each([null, 5, "text", [], true])("answers a frame that is not an object (%j) with an error", async (frame) => {
    const { sent, handle } = setup();

    await handle(frame);

    expect(sent).toEqual([invalidFrame]);
  });

  test("answers text that is not JSON with an error", async () => {
    const { sent, router, connection } = setup();

    await router.handleMessage(connection, "{not json");

    expect(sent).toEqual([invalidFrame]);
  });

  test("answers an unknown type with unknown_type, and the id it came with", async () => {
    const { sent, handle } = setup();

    await handle({ type: "start_game", id: "r1", payload: {} });

    expect(sent).toEqual([
      { type: "error", id: "r1", payload: { code: "unknown_type", message: "Unknown message type: start_game" } },
    ]);
  });

  test.each(["create_game", "list_games"])("no longer knows %s", async (type) => {
    const { sent, handle } = setup();

    await handle({ type, payload: {} });

    expect(sent).toEqual([{ type: "error", payload: expect.objectContaining({ code: "unknown_type" }) }]);
  });

  test("rejects set_ready without a boolean and does not touch the game", async () => {
    const { sent, handle, gameService } = setup();

    await handle({ type: "set_ready", payload: { gameId: 1 } });
    await handle({ type: "set_ready", payload: { gameId: 1, isReady: "false" } });

    expect(sent).toHaveLength(2);
    expect(sent.every((message) => message.type === "error")).toBe(true);
    expect(gameService.setPlayerReady).not.toHaveBeenCalled();
  });

  test("rejects make_move without a move, with the issues for the client", async () => {
    const { sent, handle, gameService } = setup();

    await handle({ type: "make_move", id: "m1", payload: { gameId: 1 } });

    expect(sent).toEqual([
      {
        type: "error",
        id: "m1",
        payload: {
          code: "invalid_payload",
          message: expect.stringMatching(/^Invalid make_move payload: move: /),
          details: { issues: [{ path: ["move"], message: expect.any(String) }] },
        },
      },
    ]);
    expect(gameService.applyMove).not.toHaveBeenCalled();
  });

  test.each([0, -1, 1.5, "1", null])("rejects the game id %j", async (gameId) => {
    const { sent, handle } = setup();

    await handle({ type: "join_game", payload: { gameId } });

    expect(sent).toEqual([{ type: "error", payload: expect.objectContaining({ code: "invalid_payload" }) }]);
  });

  test.each(["", "x".repeat(65), 5])("rejects the request id %j", async (id) => {
    const { sent, handle } = setup();

    await handle({ type: "set_ready", id, payload: { gameId: 1, isReady: true } });

    expect(sent).toEqual([{ type: "error", payload: expect.objectContaining({ code: "invalid_payload" }) }]);
  });

  test("accepts the move the current client sends, extra fields and all", async () => {
    const { handle, gameService } = setup();
    const move = { type: "move_worker", workerId: 1, position: { x: 1, y: 1 }, fromPosition: { x: 0, y: 0 } };

    await handle({ type: "make_move", payload: { gameId: 1, moveIndex: 3, serverMoveObject: {}, move } });

    expect(gameService.applyMove).toHaveBeenCalledWith(1, 1, move);
  });

  test("rejects a position off the board", async () => {
    const { sent, handle, gameService } = setup();

    await handle({
      type: "make_move",
      payload: { gameId: 1, move: { type: "place_worker", position: { x: 5, y: 0 } } },
    });

    expect(sent[0].type).toBe("error");
    expect(gameService.applyMove).not.toHaveBeenCalled();
  });
});

describe("WsRouter replies", () => {
  test("answers a command with one ok that carries its id", async () => {
    const { sent, handle } = setup();

    await handle({ type: "set_ready", id: "r2", payload: { gameId: 1, isReady: true } });

    expect(sent).toEqual([{ type: "ok", id: "r2", payload: {} }]);
  });

  test("answers without an id when the command had none", async () => {
    const { sent, handle } = setup();

    await handle({ type: "make_move", payload: { gameId: 3, move: { type: "build_dome", position: { x: 0, y: 0 } } } });

    expect(sent).toEqual([{ type: "ok", payload: {} }]);
  });

  test("join_game answers with the game id", async () => {
    const { sent, handle } = setup();

    await handle({ type: "join_game", id: "j1", payload: { gameId: 7 } });

    expect(sent).toContainEqual({ type: "ok", id: "j1", payload: { gameId: 7 } });
  });

  test("a game error becomes its code and the message meant for the player", async () => {
    const { sent, handle, gameService } = setup();
    gameService.setPlayerReady.mockRejectedValue(new GameNotFoundError(asGameId(99)));

    await handle({ type: "set_ready", id: "e1", payload: { gameId: 99, isReady: true } });

    expect(sent).toEqual([{ type: "error", id: "e1", payload: { code: "game_not_found", message: "Game not found" } }]);
  });

  test("a rule violation keeps its code", async () => {
    const { sent, handle, gameService } = setup();
    gameService.applyMove.mockRejectedValue(new GameRuleError("Not your turn", "not_your_turn"));

    await handle({
      type: "make_move",
      payload: { gameId: 1, move: { type: "build_block", position: { x: 1, y: 1 } } },
    });

    expect(sent).toEqual([{ type: "error", payload: { code: "not_your_turn", message: "Not your turn" } }]);
  });

  test("a failure that is not a game error does not leak its text", async () => {
    const { sent, handle, gameService } = setup();
    gameService.setPlayerReady.mockRejectedValue(new Error('relation "games" does not exist'));

    await handle({ type: "set_ready", id: "e2", payload: { gameId: 1, isReady: true } });

    expect(sent).toEqual([{ type: "error", id: "e2", payload: { code: "internal", message: "Something went wrong" } }]);
  });
});
