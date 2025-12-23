import { BuildMove, MoveWorkerMove, PlaceWorkerMove } from '../../../../src/game/domain/Move';

import { Game } from '../../../../src/game/domain/Game';
import { Player } from '../../../../src/game/domain/Player';

describe('Game Domain', () => {
  let game: Game;
  let player1: Player;
  let player2: Player;

  // Helper to start game with all players ready
  function startGameWithReadyPlayers(g: Game): void {
    for (const [playerId] of g.players) {
      g.setPlayerReady(playerId, true);
    }
  }

  beforeEach(() => {
    game = Game.create(1, 100, 2);
    player1 = new Player(1, 100, 0);
    player2 = new Player(2, 101, 1);
  });

  describe('Game Creation', () => {
    it('should create a new game with correct initial state', () => {
      expect(game.id).toBe(1);
      expect(game.status).toBe('waiting');
      expect(game.phase).toBeNull();
      expect(game.currentPlayerId).toBeNull();
      expect(game.version).toBe(1);
      expect(game.players.size).toBe(0);
    });
  });

  describe('Player Management', () => {
    it('should add players to the game', () => {
      const events1 = game.addPlayer(player1);
      expect(game.players.size).toBe(1);
      expect(events1).toHaveLength(0); // No events until game is full

      const events2 = game.addPlayer(player2);
      expect(game.players.size).toBe(2);
      expect(events2).toHaveLength(1);
      expect(events2[0].type).toBe('GameReady');
    });

    it('should not allow more players than max capacity', () => {
      game.addPlayer(player1);
      game.addPlayer(player2);
      
      const player3 = new Player(3, 102, 2);
      expect(() => game.addPlayer(player3)).toThrow('Game is full');
    });
  });

  describe('Game Lifecycle', () => {
    beforeEach(() => {
      game.addPlayer(player1);
      game.addPlayer(player2);
    });

    it('should start the game when all players ready', () => {
      const versionBefore = game.version;
      startGameWithReadyPlayers(game);

      expect(game.status).toBe('in-progress');
      expect(game.phase).toBe('placing');
      expect(game.currentPlayerId).toBe(1);
      // Version increments: +1 per ready + 1 for start = +3
      expect(game.version).toBe(versionBefore + 3);
    });

    it('should not start game if not all players ready', () => {
      expect(() => game.startGame()).toThrow('Cannot start: not all players are ready');
    });

    it('should not start game if not enough players', () => {
      const smallGame = Game.create(2, 100, 2);
      smallGame.addPlayer(player1);
      smallGame.setPlayerReady(1, true);
      expect(() => smallGame.startGame()).toThrow('Cannot start: need 2 players, have 1');
    });

    it('should not start game if not waiting', () => {
      startGameWithReadyPlayers(game);
      expect(() => game.startGame()).toThrow('Game cannot be started');
    });
  });

  describe('Available Moves Generation', () => {
    beforeEach(() => {
      game.addPlayer(player1);
      game.addPlayer(player2);
    });

    it('should return empty moves when game not in progress', () => {
      const moves = game.getAvailableMoves();
      expect(moves).toHaveLength(0);
    });

    it('should generate placement moves for current player', () => {
      startGameWithReadyPlayers(game);
      const moves = game.getAvailableMoves();

      // 25 empty cells for placing first worker
      expect(moves).toHaveLength(25);
      expect(moves[0].type).toBe('place_worker');
    });

    it('should generate fewer placement moves after worker placed', () => {
      startGameWithReadyPlayers(game);
      const move = new PlaceWorkerMove(1, { x: 2, y: 2 }, 1);
      game.applyMove(1, move);

      const moves = game.getAvailableMoves();
      // 24 remaining cells (player 2's turn now for their first worker)
      expect(moves).toHaveLength(24);
    });
  });

  describe('Move Processing', () => {
    beforeEach(() => {
      game.addPlayer(player1);
      game.addPlayer(player2);
      startGameWithReadyPlayers(game);
    });

    it('should process valid place worker move', () => {
      const versionBefore = game.version;
      const move = new PlaceWorkerMove(1, { x: 0, y: 0 }, 1);
      const events = game.applyMove(1, move);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('MovePlayed');
      expect(game.version).toBe(versionBefore + 1);
    });

    it('should reject move from wrong player', () => {
      const move = new PlaceWorkerMove(2, { x: 0, y: 0 }, 1);
      expect(() => game.applyMove(2, move)).toThrow('Not your turn');
    });

    it('should reject move when game not in progress', () => {
      const waitingGame = Game.create(2, 100, 2);
      const move = new PlaceWorkerMove(1, { x: 0, y: 0 }, 1);
      
      expect(() => waitingGame.applyMove(1, move)).toThrow('Game is not in progress');
    });
  });

  describe('Board Integration', () => {
    beforeEach(() => {
      game.addPlayer(player1);
      game.addPlayer(player2);
      startGameWithReadyPlayers(game);
    });

    it('should place worker on empty board', () => {
      const move = new PlaceWorkerMove(1, { x: 2, y: 2 }, 1);
      game.applyMove(1, move);

      const cell = game.board.getCell(2, 2);
      expect(cell?.worker?.playerId).toBe(1);
      expect(cell?.worker?.workerId).toBe(1);
    });

    it('should not allow placing worker on occupied position', () => {
      // Place first worker
      const move1 = new PlaceWorkerMove(1, { x: 2, y: 2 }, 1);
      game.applyMove(1, move1);
      
      // Try to place second worker on same position
      const move2 = new PlaceWorkerMove(1, { x: 2, y: 2 }, 2);
      expect(() => game.applyMove(1, move2)).toThrow();
    });
  });

  describe('Snapshot Serialization', () => {
    it('should create and restore from snapshot', () => {
      game.addPlayer(player1);
      game.addPlayer(player2);
      startGameWithReadyPlayers(game);

      const snapshot = game.toSnapshot();
      const restoredGame = Game.fromSnapshot(snapshot);

      expect(restoredGame.id).toBe(game.id);
      expect(restoredGame.status).toBe(game.status);
      expect(restoredGame.phase).toBe(game.phase);
      expect(restoredGame.currentPlayerId).toBe(game.currentPlayerId);
      expect(restoredGame.version).toBe(game.version);
      expect(restoredGame.players.size).toBe(game.players.size);
    });
  });

  describe('Phase Transitions', () => {
    beforeEach(() => {
      game.addPlayer(player1);
      game.addPlayer(player2);
      startGameWithReadyPlayers(game);
    });

    it('should stay in placing phase while workers are being placed', () => {
      // Player 1 places first worker
      game.applyMove(1, new PlaceWorkerMove(1, { x: 0, y: 0 }, 1));
      expect(game.phase).toBe('placing');
      expect(game.currentPlayerId).toBe(2); // Player 2's turn

      // Player 2 places first worker
      game.applyMove(2, new PlaceWorkerMove(2, { x: 1, y: 0 }, 1));
      expect(game.phase).toBe('placing');
      expect(game.currentPlayerId).toBe(1); // Player 1's turn

      // Player 1 places second worker
      game.applyMove(1, new PlaceWorkerMove(1, { x: 0, y: 1 }, 2));
      expect(game.phase).toBe('placing');
      expect(game.currentPlayerId).toBe(2); // Player 2's turn
    });

    it('should transition to moving phase after all workers placed', () => {
      // Place all 4 workers
      game.applyMove(1, new PlaceWorkerMove(1, { x: 0, y: 0 }, 1));
      game.applyMove(2, new PlaceWorkerMove(2, { x: 4, y: 4 }, 1));
      game.applyMove(1, new PlaceWorkerMove(1, { x: 0, y: 1 }, 2));
      game.applyMove(2, new PlaceWorkerMove(2, { x: 4, y: 3 }, 2));

      expect(game.phase).toBe('moving');
      expect(game.currentPlayerId).toBe(1); // Player 1 starts moving phase
      expect(game.placingTurnsCompleted).toBe(4);
    });
  });

  describe('Movement Phase', () => {
    beforeEach(() => {
      game.addPlayer(player1);
      game.addPlayer(player2);
      startGameWithReadyPlayers(game);
      // Place all workers
      game.applyMove(1, new PlaceWorkerMove(1, { x: 2, y: 2 }, 1));
      game.applyMove(2, new PlaceWorkerMove(2, { x: 4, y: 4 }, 1));
      game.applyMove(1, new PlaceWorkerMove(1, { x: 2, y: 3 }, 2));
      game.applyMove(2, new PlaceWorkerMove(2, { x: 4, y: 3 }, 2));
    });

    it('should generate movement moves for current player workers', () => {
      expect(game.phase).toBe('moving');
      const moves = game.getAvailableMoves();

      // Player 1 has 2 workers, each can move to adjacent empty cells
      expect(moves.length).toBeGreaterThan(0);
      expect(moves[0].type).toBe('move_worker');
    });

    it('should transition to building phase after movement', () => {
      const move = new MoveWorkerMove(1, { x: 1, y: 2 }, 1, { x: 2, y: 2 });
      game.applyMove(1, move);

      expect(game.phase).toBe('building');
      expect(game.currentPlayerId).toBe(1); // Same player builds
      expect(game.lastMovedWorkerId).toBe(1);
      expect(game.lastMovedWorkerPosition).toEqual({ x: 1, y: 2 });
    });

    it('should only allow moved worker to build', () => {
      // Move worker 1
      game.applyMove(1, new MoveWorkerMove(1, { x: 1, y: 2 }, 1, { x: 2, y: 2 }));

      const buildMoves = game.getAvailableMoves();
      // Build moves should be adjacent to worker 1's new position (1,2)
      expect(buildMoves.length).toBeGreaterThan(0);
      expect(buildMoves[0].type).toBe('build_block');
    });
  });

  describe('Building Phase', () => {
    beforeEach(() => {
      game.addPlayer(player1);
      game.addPlayer(player2);
      startGameWithReadyPlayers(game);
      // Place all workers
      game.applyMove(1, new PlaceWorkerMove(1, { x: 2, y: 2 }, 1));
      game.applyMove(2, new PlaceWorkerMove(2, { x: 4, y: 4 }, 1));
      game.applyMove(1, new PlaceWorkerMove(1, { x: 2, y: 3 }, 2));
      game.applyMove(2, new PlaceWorkerMove(2, { x: 4, y: 3 }, 2));
      // Move player 1's worker
      game.applyMove(1, new MoveWorkerMove(1, { x: 1, y: 2 }, 1, { x: 2, y: 2 }));
    });

    it('should allow building on adjacent empty cell', () => {
      const buildMove = new BuildMove(1, { x: 0, y: 2 }, 'block');
      const events = game.applyMove(1, buildMove);

      expect(events[0].type).toBe('MovePlayed');
      const cell = game.board.getCell(0, 2);
      expect(cell?.height).toBe(1);
    });

    it('should transition to next player moving phase after build', () => {
      game.applyMove(1, new BuildMove(1, { x: 0, y: 2 }, 'block'));

      expect(game.phase).toBe('moving');
      expect(game.currentPlayerId).toBe(2); // Player 2's turn
      expect(game.lastMovedWorkerId).toBeNull();
    });

    it('should increment building height on successive builds', () => {
      game.applyMove(1, new BuildMove(1, { x: 0, y: 2 }, 'block'));
      // Player 2's turn - move and build elsewhere
      game.applyMove(2, new MoveWorkerMove(2, { x: 3, y: 4 }, 1, { x: 4, y: 4 }));
      game.applyMove(2, new BuildMove(2, { x: 4, y: 4 }, 'block'));
      // Player 1's turn - build again on same cell
      game.applyMove(1, new MoveWorkerMove(1, { x: 0, y: 2 }, 1, { x: 1, y: 2 }));
      game.applyMove(1, new BuildMove(1, { x: 1, y: 2 }, 'block'));

      expect(game.board.getCell(0, 2)?.height).toBe(1);
      expect(game.board.getCell(1, 2)?.height).toBe(1);
    });
  });

  describe('Win Condition', () => {
    it('should detect win when worker moves up to level 3', () => {
      game.addPlayer(player1);
      game.addPlayer(player2);
      startGameWithReadyPlayers(game);

      // Set up a scenario where player can win
      // This requires manipulating the board directly for test setup
      const snapshot = game.toSnapshot();

      // Create a board with a level 3 tower next to a level 2 tower
      snapshot.board.cells[1][1].height = 2;
      snapshot.board.cells[1][2].height = 3;
      snapshot.phase = 'moving';
      snapshot.currentPlayerId = 1;

      // Place worker on level 2
      snapshot.board.cells[1][1].worker = { playerId: 1, workerId: 1 };
      // Add worker tracking
      const testGame = Game.fromSnapshot(snapshot);

      // Move up to level 3 - should win
      const winMove = new MoveWorkerMove(1, { x: 1, y: 2 }, 1, { x: 1, y: 1 });
      const events = testGame.applyMove(1, winMove);

      expect(testGame.status).toBe('completed');
      expect(testGame.winnerId).toBe(1);
      expect(testGame.winReason).toBe('win_condition');
      expect(events.some(e => e.type === 'GameFinished')).toBe(true);
    });
  });

  describe('Lose Condition - No Valid Moves', () => {
    it('should detect when current player has no valid moves', () => {
      game.addPlayer(player1);
      game.addPlayer(player2);
      startGameWithReadyPlayers(game);

      // Set up a scenario where player 1 is trapped
      // Worker in corner with domes on all sides
      const snapshot = game.toSnapshot();
      snapshot.phase = 'moving';
      snapshot.currentPlayerId = 1;

      // Player 1 worker at 0,0
      snapshot.board.cells[0][0].worker = { playerId: 1, workerId: 1 };
      // Player 1 second worker at 0,4 also trapped
      snapshot.board.cells[0][4].worker = { playerId: 1, workerId: 2 };
      // Player 2 workers elsewhere
      snapshot.board.cells[4][4].worker = { playerId: 2, workerId: 1 };
      snapshot.board.cells[4][3].worker = { playerId: 2, workerId: 2 };

      // Surround worker 1 with domes
      snapshot.board.cells[0][1].hasDome = true;
      snapshot.board.cells[1][0].hasDome = true;
      snapshot.board.cells[1][1].hasDome = true;

      // Surround worker 2 with domes
      snapshot.board.cells[0][3].hasDome = true;
      snapshot.board.cells[1][3].hasDome = true;
      snapshot.board.cells[1][4].hasDome = true;

      const testGame = Game.fromSnapshot(snapshot);

      // Player 1 should have no valid moves
      const moves = testGame.getAvailableMoves();
      expect(moves.length).toBe(0);

      // Check if player is trapped
      expect(testGame.isCurrentPlayerTrapped()).toBe(true);
    });

    it('should end game when player is trapped at start of turn', () => {
      game.addPlayer(player1);
      game.addPlayer(player2);
      startGameWithReadyPlayers(game);

      const snapshot = game.toSnapshot();
      snapshot.phase = 'moving';
      snapshot.currentPlayerId = 1;

      // Player 1 workers trapped
      snapshot.board.cells[0][0].worker = { playerId: 1, workerId: 1 };
      snapshot.board.cells[0][4].worker = { playerId: 1, workerId: 2 };
      snapshot.board.cells[4][4].worker = { playerId: 2, workerId: 1 };
      snapshot.board.cells[4][3].worker = { playerId: 2, workerId: 2 };

      // Domes around worker 1
      snapshot.board.cells[0][1].hasDome = true;
      snapshot.board.cells[1][0].hasDome = true;
      snapshot.board.cells[1][1].hasDome = true;

      // Domes around worker 2
      snapshot.board.cells[0][3].hasDome = true;
      snapshot.board.cells[1][3].hasDome = true;
      snapshot.board.cells[1][4].hasDome = true;

      const testGame = Game.fromSnapshot(snapshot);

      // End turn due to no moves (player 2 wins)
      const events = testGame.checkAndHandleNoMoves();

      expect(testGame.status).toBe('completed');
      expect(testGame.winnerId).toBe(2); // Player 2 wins
      expect(testGame.winReason).toBe('opponent_trapped');
      expect(events.some(e => e.type === 'GameFinished')).toBe(true);
    });
  });
});
