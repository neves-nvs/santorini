import { REDACTED, redact } from "../../src/redact";

describe("Redact", () => {
  it("should redact sensitive keys", () => {
    const user = { id: 1, username: "ana", password: "p", password_hash: "h", password_salt: "s" };

    expect(redact(user)).toEqual({
      id: 1,
      username: "ana",
      password: REDACTED,
      password_hash: REDACTED,
      password_salt: REDACTED,
    });
  });

  it("should redact sensitive keys regardless of case", () => {
    expect(redact({ Authorization: "Bearer x", JWT_SECRET: "x", Cookie: "x" })).toEqual({
      Authorization: REDACTED,
      JWT_SECRET: REDACTED,
      Cookie: REDACTED,
    });
  });

  it("should redact inside nested objects and arrays", () => {
    const value = { users: [{ name: "ana", token: "t" }], request: { headers: { cookie: "c", accept: "json" } } };

    expect(redact(value)).toEqual({
      users: [{ name: "ana", token: REDACTED }],
      request: { headers: { cookie: REDACTED, accept: "json" } },
    });
  });

  it("should not modify the original value", () => {
    const original = { password: "p" };

    redact(original);

    expect(original.password).toBe("p");
  });

  it("should keep dates, errors and primitives as they are", () => {
    const createdAt = new Date();
    const error = new Error("boom");

    expect(redact({ createdAt, error, count: 2, name: null })).toEqual({ createdAt, error, count: 2, name: null });
    expect(redact("text")).toBe("text");
  });

  it("should handle circular references", () => {
    const value: Record<string, unknown> = { name: "ana" };
    value.self = value;

    expect(redact(value)).toEqual({ name: "ana", self: "[Circular]" });
  });
});
