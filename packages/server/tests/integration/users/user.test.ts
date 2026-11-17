import { USERNAME_RULE } from "@/users/usernameRules.ts";
import { specApp as app } from "@tests/integration/helper/specApp.ts";
import { config } from "@/configs/config.ts";
import { createTestUserWithLogin } from "@tests/integration/helper/helpers.ts";
import { db } from "@/database.ts";
import { findUserByUsername } from "@/users/userRepository.ts";
import request from "supertest";
// Removed server import - not needed for HTTP tests using supertest

const userData = {
  username: "johndoe",
  password: "password",
};

describe("Users API Integration Tests", () => {
  afterEach(async () => {
    await db.deleteFrom("users").execute();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe("POST /users", () => {
    test("creates and stores new user", async () => {
      const response = await request(app).post("/users").send(userData).expect(201);

      expect(response.body).toHaveProperty("username");
      expect(response.body.username).toBe(userData.username);

      const dbUser = await findUserByUsername(userData.username);
      expect(dbUser).not.toBeNull();
      expect(dbUser?.username).toBe(userData.username);
    });

    test("stores the username trimmed and in lowercase, and the same name in another case is taken", async () => {
      const response = await request(app)
        .post("/users")
        .send({ username: "  JohnDoe ", password: "password" })
        .expect(201);

      expect(response.body.username).toBe("johndoe");
      await request(app).post("/users").send({ username: "JOHNDOE", password: "password" }).expect(409);
    });

    test.each(["john doe", "ab", "john.doe", "x".repeat(33), "jöhn"])(
      "400 Bad Request for the username %j",
      async (username) => {
        const response = await request(app).post("/users").send({ username, password: "password" }).expect(400);

        expect(response.body.error.details.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ path: ["username"], message: USERNAME_RULE })]),
        );
      },
    );

    test("the database refuses a username that breaks the format", async () => {
      await expect(
        db
          .insertInto("users")
          .values({ username: "Bad Name", display_name: "x", created_at: new Date().toISOString() })
          .execute(),
      ).rejects.toThrow(/users_username_format/);
    });

    test("409 Conflict when user already exists", async () => {
      await request(app).post("/users").send(userData).expect(201);

      const response = await request(app).post("/users").send(userData).expect(409);

      expect(response.body.error.message).toBe("User already exists");
    });

    test("400 Bad Request for missing username", async () => {
      const response = await request(app).post("/users").send({ password: "password" }).expect(400);

      expect(response.body.error.code).toBe("validation_failed");
      expect(response.body.error.details.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ message: "Username is required" })]),
      );
    });

    test("400 Bad Request for a password that is too short", async () => {
      const response = await request(app).post("/users").send({ username: "johndoe", password: "short" }).expect(400);

      expect(response.body.error.details.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ message: "Password must be at least 8 characters" })]),
      );
    });

    test("403 Forbidden when registration is disabled", async () => {
      config.registrationEnabled = false;
      try {
        await request(app).post("/users").send(userData).expect(403);
      } finally {
        config.registrationEnabled = true;
      }
    });

    test("400 Bad Request for missing password", async () => {
      const response = await request(app).post("/users").send({ username: "johndoe" }).expect(400);

      expect(response.body.error.code).toBe("validation_failed");
      expect(response.body.error.details.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ message: "Password is required" })]),
      );
    });

    // test("handles concurrent user creation attempts gracefully", async () => {
    //   await Promise.all([
    //     request(app).post("/users").send(userData).expect([201, 409]),
    //     request(app).post("/users").send(userData).expect([201, 409]),
    //   ]);

    //   const users = await db.selectFrom("users").where("username", "=", userData.username).execute();
    //   expect(users.length).toBe(1);
    // });
  });

  describe("GET /users/:username", () => {
    test("401 Unauthorized without a login", async () => {
      await request(app).post("/users").send(userData).expect(201);

      await request(app).get(`/users/${userData.username}`).expect(401);
    });

    test("200 and returns user data for a valid username", async () => {
      const { token } = await createTestUserWithLogin();
      await request(app).post("/users").send(userData).expect(201);

      const getResponse = await request(app)
        .get(`/users/${userData.username}`)
        .set("Cookie", `token=${token}`)
        .expect(200);

      expect(getResponse.body).toHaveProperty("username", userData.username);
      expect(getResponse.body.username).toBe(userData.username);
      expect(getResponse.body).not.toHaveProperty("password");
    });

    test("404 Not Found if user does not exist", async () => {
      const { token } = await createTestUserWithLogin();

      const getResponse = await request(app).get(`/users/999`).set("Cookie", `token=${token}`).expect(404);

      expect(getResponse.body.error.message).toBe("User not found");
    });
  });
});
