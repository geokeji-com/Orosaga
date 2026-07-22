import { describe, expect, it } from "vitest";
import { companyContentPayloadSchema } from "@orosaga/contracts";
import { companyDefaultContent } from "./company-default.js";

describe("companyDefaultContent", () => {
  it("is valid dedicated content with every original reading section", () => {
    const content = companyContentPayloadSchema.parse(companyDefaultContent);
    expect(content.delivery.steps).toHaveLength(6);
    expect(content.solution.systems).toHaveLength(7);
    expect(content.remember.facts).toHaveLength(5);
    expect(content.faq.items).toHaveLength(5);
  });
});
