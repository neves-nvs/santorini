import { NewUser, User } from "../../../src/model";

import { JWT_SECRET } from "../../../src/configs/config";
import { app } from "../../../src/app";
import bcrypt from "bcryptjs";
import { db } from "../../../src/database";
import jwt from "jsonwebtoken";
import request from "supertest";
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

      const decodedToken = jwt.verify(token, JWT_SECRET);

      expect(decodedToken).toHaveProperty("username", userData.username);
    });

    test("400 Bad Request when user does not exist", async () => {
      const response = await request(app)
        .post("/session")
        .send({ username: "nonexistent", password: "password" })
        .expect(400);

      expect(response.body).toHaveProperty("message", "User not found");
    });

    test("401 Unauthorized for incorrect password", async () => {
      const response = await request(app)
        .post("/session")
        .send({ username: userData.username, password: "wrongpassword" })
        .expect(401);

      expect(response.body).toHaveProperty("message", "Invalid password");
    });

    test("400 Bad Request if username is missing", async () => {
      const response = await request(app).post("/session").send({ password: password }).expect(400);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ msg: "Username is required" })]),
      );
    });

    test("400 Bad Request if password is missing", async () => {
      const response = await request(app).post("/session").send({ username: userData.username }).expect(400);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ msg: "Password is required" })]),
      );
    });
  });

  describe("GET /test-auth", () => {
    test("200 OK with valid token authentication", async () => {
      const validToken = jwt.sign({ username: userData.username }, JWT_SECRET, { expiresIn: "5h" });

      const response = await request(app).get("/test-auth").set("Cookie", `token=${validToken}`).expect(200);

      expect(response.text).toBeDefined();
      expect(response.body).toHaveProperty("username", userData.username);

      const user = response.body as User;
      expect(typeof user.id).toBe("number");
      expect(typeof user.username).toBe("string");
      expect(typeof user.display_name).toBe("string");
      expect(user.created_at instanceof Date || typeof user.created_at === "string").toBe(true);
      if (typeof user.created_at === "string") {
        expect(new Date(user.created_at).toString()).not.toBe("Invalid Date");
      }
    });

    test("401 Unauthorized if token is missing", async () => {
      const response = await request(app).get("/test-auth").expect(401);

      expect(response.body).toHaveProperty("message", "Unauthorized");
    });

    test("403 Forbidden if token is invalid", async () => {
      const invalidToken = jwt.sign({ username: userData.username }, "wrong");

      const response = await request(app).get("/test-auth").set("Cookie", `token=${invalidToken}`).expect(403);

      expect(response.body).toHaveProperty("message", "Forbidden");
    });

    test("403 Forbidden for malformed token", async () => {
      const malformedToken = "malformed.token.here";

      const response = await request(app).get("/test-auth").set("Cookie", `token=${malformedToken}`).expect(403);

      expect(response.body).toHaveProperty("message", "Forbidden");
    });
  });
});
