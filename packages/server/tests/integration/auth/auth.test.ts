import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";

import { config } from "@/configs/config.ts";
import { db } from "@/database.ts";
import { NewUser } from "@/model.ts";
import { specApp as app } from "@tests/integration/helper/specApp.ts";

// Removed server import - not needed for HTTP tests using supertest

const password = "password";
const userData = {
  username: "johndoe",
  display_name: "John Doe",
  password_hash: bcrypt.hashSync("password", 10),
} as NewUser;

describe("Auth Controller Integration Tests", () => {
  beforeEach(async () => {
    await db.insertInto("users").values(userData).execute();
  });

  afterEach(async () => {
    await db.deleteFrom("players").execute();
    await db.deleteFrom("games").execute();
    await db.deleteFrom("users").execute();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe("POST /session", () => {
    test("200 OK when the username is typed in another case or with spaces around it", async () => {
      await request(app)
        .post("/session")
        .send({ username: `  ${userData.username.toUpperCase()} `, password: password })
        .expect(200);
    });

    test("200 OK and set a cookie for valid credentials", async () => {
      const response = await request(app)
        .post("/session")
        .send({ username: userData.username, password: password })
        .expect(200);

      expect(response.text).toBe("OK");
      expect(response.headers["set-cookie"]).toBeDefined();

      const cookieHeaders = response.headers["set-cookie"];
      const cookies = cookieHeaders.toString().split(";");
      const tokenHeader = cookies.find((cookie) => cookie.startsWith("token=")) as string;
      const token = tokenHeader.split("=")[1];

      const decodedToken = jwt.verify(token, config.jwtSecret);

      expect(decodedToken).toHaveProperty("username", userData.username);
    });

    test("401 Unauthorized when user does not exist", async () => {
      const response = await request(app)
        .post("/session")
        .send({ username: "nonexistent", password: "password" })
        .expect(401);

      expect(response.body.error.message).toBe("Invalid username or password");
    });

    test("401 Unauthorized for incorrect password", async () => {
      const response = await request(app)
        .post("/session")
        .send({ username: userData.username, password: "wrongpassword" })
        .expect(401);

      expect(response.body.error.message).toBe("Invalid username or password");
    });

    test("answers an unknown user and an incorrect password identically", async () => {
      const unknownUser = await request(app)
        .post("/session")
        .send({ username: "nonexistent", password: "wrongpassword" });
      const wrongPassword = await request(app)
        .post("/session")
        .send({ username: userData.username, password: "wrongpassword" });

      expect(unknownUser.status).toBe(wrongPassword.status);
      expect(unknownUser.body).toEqual(wrongPassword.body);
      expect(unknownUser.headers["set-cookie"]).toBeUndefined();
    });

    test("401 Unauthorized for a user without a password", async () => {
      await db
        .insertInto("users")
        .values({ username: "no-password", display_name: "No Password" } as NewUser)
        .execute();

      const response = await request(app)
        .post("/session")
        .send({ username: "no-password", password: "password" })
        .expect(401);

      expect(response.body.error.message).toBe("Invalid username or password");
      expect(response.headers["set-cookie"]).toBeUndefined();
    });

    test("400 Bad Request if username is missing", async () => {
      const response = await request(app).post("/session").send({ password: password }).expect(400);

      expect(response.body.error.code).toBe("validation_failed");
      expect(response.body.error.details.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ message: "Username is required" })]),
      );
    });

    test("400 Bad Request if password is missing", async () => {
      const response = await request(app).post("/session").send({ username: userData.username }).expect(400);

      expect(response.body.error.code).toBe("validation_failed");
      expect(response.body.error.details.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ message: "Password is required" })]),
      );
    });
  });

  describe("GET /me authentication", () => {
    test("401 Unauthorized if token is missing", async () => {
      const response = await request(app).get("/me").expect(401);

      expect(response.body.error.message).toBe("Unauthorized");
    });

    test("403 Forbidden if token is invalid", async () => {
      const invalidToken = jwt.sign({ username: userData.username }, "wrong");

      const response = await request(app).get("/me").set("Cookie", `token=${invalidToken}`).expect(403);

      expect(response.body.error.message).toBe("Forbidden");
    });

    test("403 Forbidden for malformed token", async () => {
      const malformedToken = "malformed.token.here";

      const response = await request(app).get("/me").set("Cookie", `token=${malformedToken}`).expect(403);

      expect(response.body.error.message).toBe("Forbidden");
    });
  });
});
