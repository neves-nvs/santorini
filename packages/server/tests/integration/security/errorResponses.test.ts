import request from "supertest";

import { app } from "@/app.ts";
import errorHandler from "@/middlewares/errorMiddleware.ts";
import { createTestUserWithLogin } from "@tests/integration/helper/helpers.ts";
import { getTestDb } from "@tests/integration/helper/testDb.ts";

describe("Error Response Integration Tests", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("a malformed body gets a 400 without a stack trace", async () => {
    const response = await request(app).post("/session").set("Content-Type", "application/json").send("{").expect(400);

    expect(response.body).toHaveProperty("error.message");
    expect(response.body).not.toHaveProperty("stack");
  });

  test("validation errors do not echo the submitted value", async () => {
    const response = await request(app).post("/session").send({ username: "johndoe", password: 987654321 }).expect(400);

    expect(JSON.stringify(response.body)).not.toContain("987654321");
    expect(response.body.error.details.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["password"] })]),
    );
  });

  test("a database failure while authenticating gets a generic 500", async () => {
    const { token } = await createTestUserWithLogin();
    const db = getTestDb();
    const selectFrom = db.selectFrom.bind(db);
    vi.spyOn(db, "selectFrom")
      .mockImplementationOnce(selectFrom as never)
      .mockImplementationOnce((() => {
        throw new Error("connection to 10.0.0.5:5432 refused");
      }) as never);

    const response = await request(app).get("/me").set("Cookie", `token=${token}`).expect(500);

    expect(response.body).toEqual({ error: { code: "internal", message: "Something went wrong" } });
  });

  describe("error middleware", () => {
    function respondTo(error: Error & { status?: number }) {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      errorHandler(error, {} as never, res as never, vi.fn());
      return res;
    }

    test("hides the message of a server error", () => {
      const res = respondTo(Object.assign(new Error("relation users_pkey is broken"), { status: 500 }));

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: { code: "internal", message: "Something went wrong" } });
    });

    test("hides the message of an error without a status", () => {
      const res = respondTo(new Error("connection to 10.0.0.5:5432 refused"));

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: { code: "internal", message: "Something went wrong" } });
    });

    test("keeps the message of a client error and never sends the stack", () => {
      const res = respondTo(Object.assign(new Error("Unexpected token"), { status: 400 }));

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: { code: "invalid_message", message: "Unexpected token" } });
    });
  });
});
