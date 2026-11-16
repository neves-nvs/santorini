import { Connection, OutgoingMessage } from "../../../src/game/infra/Connection.ts";
import { ConnectionManager } from "../../../src/game/infra/ConnectionManager.ts";
import { GameService } from "../../../src/game/application/GameService.ts";
import { LobbyService } from "../../../src/game/application/LobbyService.ts";
import { WsRouter } from "../../../src/websockets/WsRouter.ts";

function setup() {
  const sent: OutgoingMessage[] = [];
  const connection: Connection = {
    user: { id: 1, username: "ana" } as Connection["user"],
    isOpen: true,
    send: (message) => sent.push(message),
  };
  const lobbyService = { createGame: vi.fn(async () => ({ id: 7 })) };
  const gameService = {
    addPlayer: vi.fn(async () => ({ game: { id: 7 } })),
    getGameStateForPlayer: vi.fn(async () => ({})),
    setPlayerReady: vi.fn(),
    applyMove: vi.fn(),
  };
  const router = new WsRouter(
    gameService as unknown as GameService,
    lobbyService as unknown as LobbyService,
    new ConnectionManager(),
  );
  const handle = (frame: unknown) => router.handleMessage(connection, JSON.stringify(frame));
  return { sent, handle, gameService, lobbyService, router, connection };
}

describe("WsRouter input validation", () => {
  test.each([null, 5, "text", [], true])("answers a frame that is not an object (%j) with an error", async (frame) => {
    const { sent, handle } = setup();

    await handle(frame);

    expect(sent).toEqual([{ type: "error", payload: "Invalid message format" }]);
  });

  test("answers text that is not JSON with an error", async () => {
    const { sent, router, connection } = setup();

    await router.handleMessage(connection, "{not json");

    expect(sent).toEqual([{ type: "error", payload: "Invalid message format" }]);
  });

  test("keeps the unknown type message", async () => {
    const { sent, handle } = setup();

    await handle({ type: "start_game", payload: {} });

    expect(sent).toEqual([{ type: "error", payload: "Unknown message type: start_game" }]);
  });

  test("rejects set_ready without a boolean and does not touch the game", async () => {
    const { sent, handle, gameService } = setup();

    await handle({ type: "set_ready", payload: { gameId: 1 } });
    await handle({ type: "set_ready", payload: { gameId: 1, isReady: "false" } });

    expect(sent).toHaveLength(2);
    expect(sent.every((message) => message.type === "error")).toBe(true);
    expect(gameService.setPlayerReady).not.toHaveBeenCalled();
  });

  test("rejects make_move without a move", async () => {
    const { sent, handle, gameService } = setup();

    await handle({ type: "make_move", payload: { gameId: 1 } });

    expect(sent).toEqual([{ type: "error", payload: expect.stringMatching(/^Invalid make_move payload: move: /) }]);
    expect(gameService.applyMove).not.toHaveBeenCalled();
  });

  test.each([0, -1, 1.5, "1", null])("rejects the game id %j", async (gameId) => {
    const { sent, handle } = setup();

    await handle({ type: "join_game", payload: { gameId } });

    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe("error");
  });

  test.each([1, 5, 1000, "3", 2.5, null])("rejects maxPlayers %j", async (maxPlayers) => {
    const { sent, handle, lobbyService } = setup();

    await handle({ type: "create_game", payload: { maxPlayers } });

    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe("error");
    expect(lobbyService.createGame).not.toHaveBeenCalled();
  });

  test.each([2, 3, 4])("creates a game for %i players", async (maxPlayers) => {
    const { handle, lobbyService } = setup();

    await handle({ type: "create_game", payload: { maxPlayers } });

    expect(lobbyService.createGame).toHaveBeenCalledWith(1, maxPlayers);
  });

  test.each([undefined, {}])("creates a two player game when maxPlayers is left out (%j)", async (payload) => {
    const { handle, lobbyService } = setup();

    await handle({ type: "create_game", payload });

    expect(lobbyService.createGame).toHaveBeenCalledWith(1, 2);
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
