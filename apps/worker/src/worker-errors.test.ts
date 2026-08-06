import { describe, expect, it } from "vitest";
import {
  databaseRetryDelayMs,
  isDatabaseConnectionError,
  safeWorkerError,
} from "./worker-errors.js";

describe("worker database failure boundaries", () => {
  it("recognizes exhausted database connections and bounds retries", () => {
    expect(
      isDatabaseConnectionError(
        new Error("remaining connection slots are reserved"),
      ),
    ).toBe(true);
    expect(databaseRetryDelayMs(1)).toBe(1_000);
    expect(databaseRetryDelayMs(7)).toBe(60_000);
  });

  it("keeps database URLs out of logs", () => {
    expect(safeWorkerError(new Error("postgres://user:secret@rds/db"))).toBe(
      "postgres://[redacted]@rds/db",
    );
  });
});
