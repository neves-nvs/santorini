import { Game, Player } from "@santorini/engine";
import { Connection } from "@/game/infra/Connection.ts";
import { ConnectionManager } from "@/game/infra/ConnectionManager.ts";
import { GameBroadcaster } from "@/game/application/GameBroadcaster.ts";
import { ServerMessage } from "@santorini/shared";
import { User } from "@/model.ts";

class RecordingConnection implements Connection {
  isOpen = true;
  readonly sent: ServerMessage[] = [];
  readonly user: User;

  constructor(userId: number) {
    this.user = { id: userId, username: `user-${userId}` } as User;
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

function startedGame(): Game {
  const game = Game.create(1, 100, 2);
  game.addPlayer(new Player(1, 100, 0));
  game.addPlayer(new Player(2, 101, 1));
  for (const [playerId] of game.players) {
    game.setPlayerReady(playerId, true);
  }
  return game;
}

describe("GameBroadcaster", () => {
  it("sends the available moves only to the player whose turn it is", () => {
    const game = startedGame();
    const connectionManager = new ConnectionManager();
    const currentPlayer = new RecordingConnection(100);
    const waitingPlayer = new RecordingConnection(101);
    connectionManager.addClient(game.id, 100, currentPlayer);
    connectionManager.addClient(game.id, 101, waitingPlayer);

    new GameBroadcaster(undefined, connectionManager).broadcastGameUpdate(game);

    const current = viewerSentTo(currentPlayer);
    expect(current.role === "player" && current.availableMoves.length).toBeGreaterThan(0);
    expect(viewerSentTo(waitingPlayer)).toEqual({
      role: "player",
      playerId: 2,
      isCurrentPlayer: false,
      availableMoves: [],
    });
  });

  it("sends a spectator the game too, as a spectator", () => {
    const game = startedGame();
    const connectionManager = new ConnectionManager();
    const spectator = new RecordingConnection(999);
    connectionManager.addClient(game.id, 999, spectator);

    new GameBroadcaster(undefined, connectionManager).broadcastGameUpdate(game);

    expect(viewerSentTo(spectator)).toEqual({ role: "spectator" });
  });

  it("sends nothing to a socket subscribed to another game, or already closed", () => {
    const game = startedGame();
    const connectionManager = new ConnectionManager();
    const elsewhere = new RecordingConnection(100);
    const closed = new RecordingConnection(101);
    closed.isOpen = false;
    connectionManager.addClient(2, 100, elsewhere);
    connectionManager.addClient(game.id, 101, closed);

    new GameBroadcaster(undefined, connectionManager).broadcastGameUpdate(game);

    expect(elsewhere.sent).toEqual([]);
    expect(closed.sent).toEqual([]);
  });

  it("sends each subscribed socket one message", () => {
    const game = startedGame();
    const connectionManager = new ConnectionManager();
    const first = new RecordingConnection(100);
    const second = new RecordingConnection(100);
    connectionManager.addClient(game.id, 100, first);
    connectionManager.addClient(game.id, 100, second);

    new GameBroadcaster(undefined, connectionManager).broadcastGameUpdate(game);

    expect(first.sent).toHaveLength(1);
    expect(second.sent).toHaveLength(1);
  });
});
