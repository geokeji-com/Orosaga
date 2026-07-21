import { describe, expect, it } from "vitest";
import type { Camp } from "@orosaga/contracts";
import { distributeCamps } from "./camps";

const camp = (index: number): Camp => ({
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  displayCode: `CAMP-${index}`,
  title: String(index),
  href: "https://example.com",
  legacyDescendantCount: 0,
  documentCount: 0,
  syncedAt: "2026-07-21T00:00:00.000Z",
});

describe("camp altitude distribution", () => {
  it("balances arbitrary camp counts across four sections", () => {
    const result = distributeCamps(
      Array.from({ length: 17 }, (_, index) => camp(index + 1)),
    );
    expect(result.map((group) => group.length)).toEqual([5, 4, 4, 4]);
    expect(result.flat()).toHaveLength(17);
  });
});
