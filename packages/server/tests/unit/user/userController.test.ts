import { User } from '../../../src/users/user';
import express from 'express';
import request from 'supertest';
import userController from '../../../src/users/userController';
import userService from '../../../src/users/userService';

jest.mock('../../../src/users/userService');
jest.mock('../../../src/users/userRepository');

const app = express();
app.use(express.json());
app.use('/users', userController);

describe('User Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe('GET /users', () => {
        it('should return a list of users', async () => {
            const mockUser = new User('user1');
            const mockUsers = [mockUser];
            (userService.getUsers as jest.Mock).mockReturnValue(mockUsers);

            const response = await request(app).get('/users');
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockUsers);
        });

        it('should handle errors', async () => {
            (userService.getUsers as jest.Mock).mockImplementation(
                () => { throw new Error('Error fetching users'); }
            );

            const response = await request(app).get('/users');
            expect(response.status).toBe(400);
            expect(response.text).toBe('Error fetching users');
        });
    });

    describe('GET /users/:id', () => {
        it('should return a user by ID', async () => {
            const mockUser = new User('user1');
            (userService.getUserById as jest.Mock).mockReturnValue(mockUser);

            const response = await request(app).get('/users/user1');
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockUser);
        });

        it('should return 404 if user not found', async () => {
            (userService.getUserById as jest.Mock).mockReturnValue(null);

            const response = await request(app).get('/users/1');
            expect(response.status).toBe(404);
            expect(response.text).toBe('User not found');
        });

        it('should handle errors', async () => {
            (userService.getUserById as jest.Mock).mockImplementation(
                () => { throw new Error('Error fetching user'); }
            );

            const response = await request(app).get('/users/1');
            expect(response.status).toBe(400);
            expect(response.text).toBe('Error fetching user');
        });
    });

    describe('POST /users', () => {
        it('should create a new user', async () => {
            const mockUser = { id: '1', username: 'user1' };
            (userService.createUser as jest.Mock).mockReturnValue(mockUser);

            const response = await request(app).post('/users').send({ username: 'user1' });
            expect(response.status).toBe(201);
            expect(response.body).toEqual(mockUser);
        });

        it('should handle validation errors', async () => {
            const response = await request(app).post('/users').send({ username: '' });
            expect(response.status).toBe(400);
            expect(response.body.errors).toBeDefined();
        });

        it('should handle errors', async () => {
            (userService.createUser as jest.Mock).mockImplementation(
                () => { throw new Error('Error creating user'); }
            );

            const response = await request(app).post('/users').send({ username: 'user1' });
            expect(response.status).toBe(400);
            expect(response.text).toBe('Error creating user');
        });
    });
});
