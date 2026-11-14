import { getTestDb } from "../helper/testDb.ts";
import logger from "../../../src/logger.ts";

describe("Database Query Logging Integration Tests", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("logs a failed query with its SQL and error code", async () => {
    const error = vi.spyOn(logger, "error");

    await expect(
      getTestDb()
        .selectFrom("users")
        .select("missing_column" as never)
        .execute(),
    ).rejects.toThrow();

    expect(error).toHaveBeenCalledWith(
      "Database query failed",
      expect.objectContaining({
        sql: expect.stringContaining("missing_column") as string,
        code: "42703",
        error: expect.stringContaining("missing_column") as string,
      }),
    );
  });

  test("does not log the query parameters", async () => {
    const error = vi.spyOn(logger, "error");
    const debug = vi.spyOn(logger, "debug");

    await expect(
      getTestDb()
        .selectFrom("users")
        .where("username", "=", "secret-parameter")
        .select("missing_column" as never)
        .execute(),
    ).rejects.toThrow();
    await getTestDb().selectFrom("users").where("username", "=", "secret-parameter").selectAll().execute();

    expect(JSON.stringify([...error.mock.calls, ...debug.mock.calls])).not.toContain("secret-parameter");
  });

  test("logs a successful query at debug level with its duration", async () => {
    const debug = vi.spyOn(logger, "debug");

    await getTestDb().selectFrom("users").selectAll().execute();

    expect(debug).toHaveBeenCalledWith(
      "Database query",
      expect.objectContaining({
        sql: expect.stringContaining('from "users"') as string,
        durationMs: expect.any(Number) as number,
      }),
    );
  });
});
