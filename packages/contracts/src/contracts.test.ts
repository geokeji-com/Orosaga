import { describe, expect, it } from "vitest";
import {
  contentPayloadSchema,
  organizationQuerySchema,
  saveContentPageSchema,
} from "./index.js";

describe("shared contracts", () => {
  it("accepts structured content without arbitrary HTML", () => {
    const content = {
      title: "公司",
      summary: "摘要",
      blocks: [{ type: "text", body: "正文" }],
    };
    expect(contentPayloadSchema.parse(content)).toEqual(content);
    expect(
      saveContentPageSchema.safeParse({
        expectedVersion: 1,
        changeSummary: "",
        content,
      }).success,
    ).toBe(false);
  });

  it("limits organization query input", () => {
    expect(
      organizationQuerySchema.safeParse({ q: "x".repeat(101) }).success,
    ).toBe(false);
    expect(organizationQuerySchema.safeParse({ q: "技术" }).success).toBe(true);
  });
});
