import { app } from "../../../src/app";
import { db } from "../../../src/database";
import { findUserByUsername } from "../../../src/users/userRepository";
import request from "supertest";
import { server } from "../../../src/main";

const userData = {
  username: "johndoe",
  password: "password",
};

describe("Users API Integration Tests", () => {
  afterEach(async () => {
    await db.deleteFrom("users").execute();
  });

  afterAll(() => {
    server.close();
    db.destroy();
  });

  describe("POST /users", () => {
    test("should create a new user and store it in the database", async () => {
      const response = await request(app).post("/users").send(userData).expect(201);

      expect(response.body).toHaveProperty("username");
      expect(response.body.username).toBe(userData.username);

      const dbUser = await findUserByUsername(userData.username);
      expect(dbUser).not.toBeNull();
      expect(dbUser?.username).toBe(userData.username);
    });

    test("409 Conflict if the user already exists", async () => {
      await request(app).post("/users").send(userData).expect(201);

      const response = await request(app).post("/users").send(userData).expect(409);

      expect(response.body).toHaveProperty("message", "User already exists");
    });

    test("400 Bad Request if username is missing", async () => {
      const response = await request(app).post("/users").send({ password: "password" }).expect(400);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ msg: "Username is required" })]),
      );
    });

    test("400 Bad Request if password is missing", async () => {
      const response = await request(app).post("/users").send({ username: "johndoe" }).expect(400);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ msg: "Password is required" })]),
      );
    });

    test("concurrent user creation attempts gracefully", async () => {
      await Promise.all([
        request(app).post("/users").send(userData).expect([201, 409]),
        request(app).post("/users").send(userData).expect([201, 409]),
      ]);

      const users = await db.selectFrom("users").where("username", "=", userData.username).execute();
      expect(users.length).toBe(1);
    });
  });

  describe("GET /users/:username", () => {
    test("201 and the user when a valid username is provided", async () => {
      await request(app).post("/users").send(userData).expect(201);

      const getResponse = await request(app).get(`/users/${userData.username}`).expect(200);

      expect(getResponse.body).toHaveProperty("username", userData.username);
      expect(getResponse.body.username).toBe(userData.username);
      expect(getResponse.body).not.toHaveProperty("password");
    });

    test("404 Not Found if the user does not exist", async () => {
      const getResponse = await request(app).get(`/users/999`).expect(404);

      expect(getResponse.body).toHaveProperty("message", "User not found");
    });
  });
});
