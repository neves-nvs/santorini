import { app, server } from '../../src/main';

import { gameRepository } from '../../src/game/gameRepository';
import request from 'supertest';
import { userRepository } from '../../src/users/userRepository';

jest.mock('../../src/game/gameRepository');
jest.mock('../../src/users/userRepository');

const mockUsername = 'testUser';
describe('Game Endpoints', () => {

    const mockGameId = '123e4567-e89b-12d3-a456-426614174000';
    const mockPlayerId = '123e4567-e89b-12d3-a456-426614174001';

    beforeAll(() => {
        gameRepository.getGamesIds = jest.fn().mockReturnValue([mockGameId]);
        gameRepository.createGame = jest.fn().mockReturnValue({
            getId: () => mockGameId,
        });
        gameRepository.getGame = jest.fn().mockReturnValue({
            addPlayer: jest.fn(),
            isReadyToStart: jest.fn().mockReturnValue(false),
            start: jest.fn(),
            getCurrentPlayer: jest.fn(),
            updatePlays: jest.fn(),
            getPlays: jest.fn().mockReturnValue([]),
        });
        userRepository.findUserById = jest.fn().mockReturnValue({
            getUsername: () => mockUsername,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        server.close();
    });

    describe('GET /games', () => {
        it('should return a list of game IDs', async () => {
            const response = await request(app).get('/games');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toContain(mockGameId);
        });
    });

    describe('POST /games', () => {
        it('should create a new game', async () => {
            const newGame = { username: mockUsername, amountOfPlayers: 4 };
            const response = await request(app).post('/games').send(newGame);
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('gameId', mockGameId);
        });
    });

    describe('DELETE /games/:gameId', () => {
        it('should return 501 Not Implemented', async () => {
            const response = await request(app).delete(`/games/${mockGameId}`);
            expect(response.status).toBe(501);
            expect(response.text).toBe('Delete game not implemented');
        });
    });

    describe('POST /games/:gameId/players', () => {
        it('should add a player to the game', async () => {
            const player = { username: mockUsername };
            const response = await request(app).post(`/games/${mockGameId}/players`).send(player);
            expect(response.status).toBe(201);
        });
    });

    // describe('POST /games/join', () => {
    //     it('should join a player to a game', async () => {
    //         const joinRequest = { username: mockUsername, gameID: mockGameId };
    //         const response = await request(app).post('/games/join').send(joinRequest);
    //         expect(response.status).toBe(201);
    //         expect(response.body).toHaveProperty('gameId', mockGameId);
    //     });
    // });

    describe('GET /games/:gameId/plays', () => {
        it('should return the plays of a player', async () => {
            const response = await request(app).get(`/games/${mockGameId}/plays`).send({ playerId: mockPlayerId });
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('POST /games/:gameId/plays', () => {
        it('should return 501 Not Implemented', async () => {
            const playRequest = { playerID: mockPlayerId, play: 'move' };
            const response = await request(app).post(`/games/${mockGameId}/plays`).send(playRequest);
            expect(response.status).toBe(501);
            expect(response.text).toBe('Post plays not implemented');
        });
    });

    describe('POST /games/plays', () => {
        it('should log play details and return 201', async () => {
            const playRequest = { gameID: mockGameId, playerID: mockPlayerId, play: 'move' };
            const response = await request(app).post('/games/plays').send(playRequest);
            expect(response.status).toBe(201);
        });
    });
});
