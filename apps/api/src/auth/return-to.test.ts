import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./return-to.js";

describe("safeReturnTo", () => {
  const origin = "https://orosaga.wanhuchangan.com";

  it("keeps an internal route including query and hash", () => {
    expect(safeReturnTo("/organization?q=运营#team", origin)).toBe(
      "/organization?q=%E8%BF%90%E8%90%A5#team",
    );
  });

  it.each([
    "https://evil.example/path",
    "//evil.example/path",
    "/\\evil.example/path",
    "organization",
    "x".repeat(2_049),
  ])("rejects unsafe return target %s", (value) => {
    expect(safeReturnTo(value, origin)).toBe("/");
  });
});
