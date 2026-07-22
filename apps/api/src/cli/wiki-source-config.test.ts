import { describe, expect, it } from "vitest";
import { resolveExcludedTokens } from "./wiki-source-config.js";

describe("resolveExcludedTokens", () => {
  it("resolves every title to one unique token", () => {
    expect(
      resolveExcludedTokens(
        [
          { title: "A", node_token: "token-a" },
          { title: "B", node_token: "token-b" },
        ],
        ["A", "B"],
      ),
    ).toEqual(["token-a", "token-b"]);
  });

  it("rejects duplicate matches even when the total count looks correct", () => {
    expect(() =>
      resolveExcludedTokens(
        [
          { title: "A", node_token: "token-a-1" },
          { title: "A", node_token: "token-a-2" },
        ],
        ["A", "B"],
      ),
    ).toThrow("matched 2");
  });
});
