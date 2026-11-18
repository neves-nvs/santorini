import { sanitizeForLog } from "@/logSanitizer.ts";

describe("sanitizeForLog", () => {
  test("leaves ordinary text, including accents and emoji, as it is", () => {
    expect(sanitizeForLog("café 😀 /games/1?x=y")).toBe("café 😀 /games/1?x=y");
  });

  test.each([
    ["line breaks", "a\nb\rc", "abc"],
    ["other control characters and escape sequences", "a\u001B[31mred\u001B[0m\u0007b", "a[31mred[0mb"],
    ["the Unicode line and paragraph separators", "a b c", "abc"],
    ["characters that reorder or hide text", "a‮b​c", "abc"],
  ])("removes %s", (_name, value, expected) => {
    expect(sanitizeForLog(value)).toBe(expected);
  });

  test("turns other values into text first", () => {
    expect(sanitizeForLog(42)).toBe("42");
    expect(sanitizeForLog(undefined)).toBe("undefined");
  });
});
