import { asGameId, asSeat, asUserId, Game, Player } from "@santorini/engine";
import { ServerMessage } from "@santorini/shared";

import { GameBroadcaster } from "@/game/application/GameBroadcaster.ts";
import { GameViewBuilder } from "@/game/application/GameViewBuilder.ts";
import { Connection } from "@/game/infra/Connection.ts";
import { ConnectionManager } from "@/game/infra/ConnectionManager.ts";
import { UserRow } from "@/model.ts";

class RecordingConnection implements Connection {
  isOpen = true;
  readonly sent: ServerMessage[] = [];
  readonly user: UserRow;

  constructor(userId: number) {
    this.user = { id: userId, username: `user-${userId}` } as UserRow;
  }

  send(message: ServerMessage): void {
    this.sent.push(message);
  }
}

function viewerSentTo(connection: RecordingConnection) {
  const [update] = connection.sent;
  if (update?.type !== "game_state") throw new Error("No game_state was sent");
  return update.payload.viewer;
}

function broadcast(game: Game, connectionManager: ConnectionManager) {
  const loadUsernames = async (userIds: readonly number[]) =>
    new Map(userIds.map((userId) => [userId, `user-${userId}`] as const));
  return new GameBroadcaster(new GameViewBuilder(), connectionManager, loadUsernames).broadcastGameUpdate(game);
}

function startedGame(): Game {
  const game = Game.create(asGameId(1), asUserId(100), 2);
  game.addPlayer(new Player(asUserId(100)));
  game.addPlayer(new Player(asUserId(101)));
  game.players.forEach((_, seat) => game.setPlayerReady(asSeat(seat), true));
  return game;
}

describe("GameBroadcaster", () => {
  it("sends the available moves only to the player whose turn it is", async () => {
    const game = startedGame();
    const connectionManager = new ConnectionManager();
    const currentPlayer = new RecordingConnection(100);
    const waitingPlayer = new RecordingConnection(101);
    connectionManager.addClient(game.id, asUserId(100), currentPlayer);
    connectionManager.addClient(game.id, asUserId(101), waitingPlayer);

    await broadcast(game, connectionManager);

    const current = viewerSentTo(currentPlayer);
    expect(current.role === "player" && current.availableMoves.length).toBeGreaterThan(0);
    expect(viewerSentTo(waitingPlayer)).toEqual({
      role: "player",
      isCurrentPlayer: false,
      availableMoves: [],
    });
  });

  it("sends a spectator the game too, as a spectator", async () => {
    const game = startedGame();
    const connectionManager = new ConnectionManager();
    const spectator = new RecordingConnection(999);
    connectionManager.addClient(game.id, asUserId(999), spectator);

    await broadcast(game, connectionManager);

    expect(viewerSentTo(spectator)).toEqual({ role: "spectator" });
  });

  it("sends nothing to a socket subscribed to another game, or already closed", async () => {
    const game = startedGame();
    const connectionManager = new ConnectionManager();
    const elsewhere = new RecordingConnection(100);
    const closed = new RecordingConnection(101);
    closed.isOpen = false;
    connectionManager.addClient(asGameId(2), asUserId(100), elsewhere);
    connectionManager.addClient(game.id, asUserId(101), closed);

    await broadcast(game, connectionManager);

    expect(elsewhere.sent).toEqual([]);
    expect(closed.sent).toEqual([]);
  });

  it("sends each subscribed socket one message", async () => {
    const game = startedGame();
    const connectionManager = new ConnectionManager();
    const first = new RecordingConnection(100);
    const second = new RecordingConnection(100);
    connectionManager.addClient(game.id, asUserId(100), first);
    connectionManager.addClient(game.id, asUserId(100), second);

    await broadcast(game, connectionManager);

    expect(first.sent).toHaveLength(1);
    expect(second.sent).toHaveLength(1);
  });
});
