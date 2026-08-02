import { describe, expect, it } from "vitest";
import { ActiveDurationTracker } from "./assessment-active-time";

describe("assessment active duration", () => {
  it("excludes time while the page is hidden or unfocused", () => {
    const tracker = new ActiveDurationTracker(0, true);

    tracker.setActive(false, 1_000);
    tracker.setActive(true, 5_000);

    expect(tracker.readAndReset(7_000, true)).toBe(3_000);
    expect(tracker.readAndReset(8_000, true)).toBe(1_000);
  });
});
