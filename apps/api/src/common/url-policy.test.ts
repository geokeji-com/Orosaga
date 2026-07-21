import { describe, expect, it } from "vitest";
import { isAllowedSystemUrl } from "./url-policy.js";

describe("system URL policy", () => {
  const allowed = ["example.com"];
  it("accepts only approved HTTPS hosts", () => {
    expect(isAllowedSystemUrl("https://example.com/workbench", allowed)).toBe(
      true,
    );
    expect(isAllowedSystemUrl("https://other.example.com", allowed)).toBe(
      false,
    );
  });
  it.each([
    "http://example.com",
    "https://localhost:3302",
    "https://47.95.247.158/",
    "javascript:alert(1)",
    "https://user:pass@example.com",
  ])("rejects %s", (url) => {
    expect(isAllowedSystemUrl(url, allowed)).toBe(false);
  });
});
