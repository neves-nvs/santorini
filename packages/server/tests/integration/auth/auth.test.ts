import request from "supertest";
import { app, server } from "../../../src/main";
import { db } from "../../../src/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../../src/config";
import { NewUser } from "../../../src/model";

const password = "password";
const userData = {
  username: "johndoe",
  password_hash: bcrypt.hashSync("password", 10),
} as NewUser;

describe("Auth Controller Integration Tests", () => {
  beforeEach(async () => {
    await db.insertInto("users").values(userData).execute();
  });

  afterEach(async () => {
    await db.deleteFrom("users").execute();
  });

  afterAll(() => {
    server.close();
    db.destroy();
  });

  describe("POST /session", () => {
    test("should return 200 and set a cookie when valid credentials are provided", async () => {
      const response = await request(app)
        .post("/session")
        .send({ username: userData.username, password: password })
        .expect(200);

      expect(response.text).toBe("OK");
      expect(response.headers["set-cookie"]).toBeDefined();

      const token = response.headers["set-cookie"][0].split(";")[0].split("=")[1];
      const decodedToken = jwt.verify(token, JWT_SECRET!);

      expect(decodedToken).toHaveProperty("username", userData.username);
    });

    test("should return 400 when the user does not exist", async () => {
      const response = await request(app)
        .post("/session")
        .send({ username: "nonexistent", password: "password" })
        .expect(400);

      expect(response.body).toHaveProperty("message", "User not found");
    });

    test("should return 401 when an incorrect password is provided", async () => {
      const response = await request(app)
        .post("/session")
        .send({ username: userData.username, password: "wrongpassword" })
        .expect(401);

      expect(response.body).toHaveProperty("message", "Invalid password");
    });

    test("should return 400 if username is missing", async () => {
      const response = await request(app).post("/session").send({ password: password }).expect(400);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ msg: "Username is required" })]),
      );
    });

    test("should return 400 if password is missing", async () => {
      const response = await request(app).post("/session").send({ username: userData.username }).expect(400);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ msg: "Password is required" })]),
      );
    });
  });

  describe("GET /test-auth", () => {
    test("should return 401 if no token is provided", async () => {
      const response = await request(app).get("/test-auth").expect(401);

      expect(response.body).toHaveProperty("message", "Unauthorized");
    });

    test("should return 403 if an invalid token is provided", async () => {
      const invalidToken = jwt.sign({ username: userData.username }, "wrongsecret");

      const response = await request(app).get("/test-auth").set("Cookie", `token=${invalidToken}`).expect(403);

      expect(response.body).toHaveProperty("message", "Forbidden");
    });

    test("should return 200 and authenticate the user when a valid token is provided", async () => {
      const validToken = jwt.sign({ username: userData.username }, JWT_SECRET!, { expiresIn: "5h" });

      const response = await request(app).get("/test-auth").set("Cookie", `token=${validToken}`).expect(200);

      expect(response.text).toBeDefined();
    });
  });
});
