import { sanitizeForLog } from "@/logSanitizer.ts";

describe("sanitizeForLog", () => {
  test("leaves ordinary text, including accents and emoji, as it is", () => {
    expect(sanitizeForLog("caf\u00E9 \u{1F600} /games/1?x=y")).toBe("caf\u00E9 \u{1F600} /games/1?x=y");
  });

  test.each([
    ["line breaks", "a\nb\rc", "abc"],
    ["other control characters and escape sequences", "a\u001B[31mred\u001B[0m\u0007b", "a[31mred[0mb"],
    ["the Unicode line and paragraph separators", "a\u2028b\u2029c", "abc"],
    ["characters that reorder or hide text", "a\u202Eb\u200Bc", "abc"],
  ])("removes %s", (_name, value, expected) => {
    expect(sanitizeForLog(value)).toBe(expected);
  });

  test("turns other values into text first", () => {
    expect(sanitizeForLog(42)).toBe("42");
    expect(sanitizeForLog(undefined)).toBe("undefined");
  });
});
