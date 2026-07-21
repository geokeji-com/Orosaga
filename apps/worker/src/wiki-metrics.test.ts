import { describe, expect, it } from "vitest";
import { countWikiDescendants } from "./wiki-metrics.js";

describe("Wiki metrics", () => {
  it("separates legacy descendants from explicit documents", () => {
    const nodes = [
      { node_token: "folder", parent_node_token: "root", obj_type: "folder" },
      { node_token: "doc", parent_node_token: "folder", obj_type: "docx" },
      { node_token: "sheet", parent_node_token: "root", obj_type: "sheet" },
    ];
    expect(countWikiDescendants("root", nodes)).toEqual({
      legacyDescendantCount: 3,
      documentCount: 1,
    });
  });
  it("returns zero for an empty subtree", () => {
    expect(countWikiDescendants("missing", [])).toEqual({
      legacyDescendantCount: 0,
      documentCount: 0,
    });
  });
});
