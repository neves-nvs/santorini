import { Connection } from "@/game/infra/Connection.ts";
import { ConnectionManager } from "@/game/infra/ConnectionManager.ts";
import { Game } from "@/game/domain/Game.ts";
import { GameBroadcaster } from "@/game/application/GameBroadcaster.ts";
import { Player } from "@/game/domain/Player.ts";
import { ServerMessage } from "@santorini/shared";
import { User } from "@/model.ts";

class RecordingConnection implements Connection {
  readonly isOpen = true;
  readonly sent: ServerMessage[] = [];
  readonly user: User;

  constructor(userId: number) {
    this.user = { id: userId, username: `user-${userId}` } as User;
  }

  send(message: ServerMessage): void {
    this.sent.push(message);
  }
}

function availableMovesSentTo(connection: RecordingConnection): unknown {
  const update = connection.sent.find((message) => message.type === "game_state_update");
  return (update?.payload as { state: { availableMoves?: unknown } }).state.availableMoves;
}

describe("GameBroadcaster available moves", () => {
  it("sends the available moves only to the player whose turn it is", async () => {
    const game = Game.create(1, 100, 2);
    game.addPlayer(new Player(1, 100, 0));
    game.addPlayer(new Player(2, 101, 1));
    for (const [playerId] of game.players) {
      game.setPlayerReady(playerId, true);
    }
    const connectionManager = new ConnectionManager();
    const currentPlayer = new RecordingConnection(100);
    const waitingPlayer = new RecordingConnection(101);
    connectionManager.addClient(game.id, 100, currentPlayer);
    connectionManager.addClient(game.id, 101, waitingPlayer);

    await new GameBroadcaster(undefined, connectionManager).broadcastGameUpdate(game, []);

    expect(availableMovesSentTo(currentPlayer)).toEqual(expect.any(Array));
    expect(availableMovesSentTo(waitingPlayer)).toBeUndefined();
  });
});
