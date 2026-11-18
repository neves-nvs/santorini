import { MAX_PASSWORD_BYTES, createUserRequestSchema, loginRequestSchema } from "@santorini/shared";

const composed = "café-secret-1";
const decomposed = "café-secret-1";

function register(username: string, password = "long-enough-password") {
  return createUserRequestSchema.safeParse({ username, password });
}

describe("The username in a request", () => {
  test("is trimmed and lowercased", () => {
    expect(register("  JohnDoe ").data?.username).toBe("johndoe");
  });

  test.each(["Kevin", "İstanbul", "player１２", "ca​sey", "casey\u{1F600}", "john doe", "ab"])(
    "%j is refused, also when lowercasing would turn it into plain letters",
    (username) => {
      expect(register(username).success).toBe(false);
    },
  );
});

describe("The password in a request", () => {
  test("is normalised, so the same text typed with composed or decomposed accents is one password", () => {
    expect(composed).not.toBe(decomposed);

    expect(register("casey", composed).data?.password).toBe(register("casey", decomposed).data?.password);
    expect(loginRequestSchema.safeParse({ username: "casey", password: decomposed }).data?.password).toBe(
      loginRequestSchema.safeParse({ username: "casey", password: composed }).data?.password,
    );
  });

  test("may use all the bytes that bcrypt reads", () => {
    expect(register("casey", "a".repeat(MAX_PASSWORD_BYTES)).success).toBe(true);
    expect(register("casey", "\u{1F600}".repeat(MAX_PASSWORD_BYTES / 4)).success).toBe(true);
  });

  test("is refused when bcrypt would ignore the end of it", () => {
    const tooLong = register("casey", "a".repeat(MAX_PASSWORD_BYTES + 1));
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0].message).toBe(`Password must be at most ${MAX_PASSWORD_BYTES} bytes`);
    expect(register("casey", "\u{1F600}".repeat(MAX_PASSWORD_BYTES / 4 + 1)).success).toBe(false);
  });

  test("counts the bytes of the normalised text", () => {
    // "ﬃ" is one character that normalises to "ffi", three bytes
    expect(register("casey", "ﬃ".repeat(MAX_PASSWORD_BYTES / 3 + 1)).success).toBe(false);
  });
});
