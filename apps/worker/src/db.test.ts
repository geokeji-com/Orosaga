import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:5432/test";
});

import { type AdvisoryLockClient, withAdvisoryLock } from "./db.js";

function clientWithLock(locked: boolean) {
  const events: string[] = [];
  const client = {
    connect: vi.fn(async () => events.push("connect")),
    query: vi.fn(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) {
        events.push("acquire");
        return { rows: [{ locked }] };
      }
      events.push("unlock");
      return { rows: [{ unlocked: true }] };
    }),
    end: vi.fn(async () => events.push("end")),
  };
  return { client: client as unknown as AdvisoryLockClient, events };
}

describe("withAdvisoryLock", () => {
  it("acquires, runs, unlocks and closes on the same dedicated client", async () => {
    const { client, events } = clientWithLock(true);
    const task = vi.fn(async () => {
      events.push("task");
      return "done";
    });

    await expect(withAdvisoryLock("sync", task, () => client)).resolves.toBe(
      "done",
    );
    expect(events).toEqual(["connect", "acquire", "task", "unlock", "end"]);
    expect(client.query).toHaveBeenNthCalledWith(
      1,
      "SELECT pg_try_advisory_lock(hashtext($1)) AS locked",
      ["sync"],
    );
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      "SELECT pg_advisory_unlock(hashtext($1)) AS unlocked",
      ["sync"],
    );
  });

  it("unlocks and closes when the task fails", async () => {
    const { client, events } = clientWithLock(true);
    await expect(
      withAdvisoryLock(
        "sync",
        async () => {
          events.push("task");
          throw new Error("boom");
        },
        () => client,
      ),
    ).rejects.toThrow("boom");
    expect(events).toEqual(["connect", "acquire", "task", "unlock", "end"]);
  });

  it("closes without running or unlocking when the lock is unavailable", async () => {
    const { client, events } = clientWithLock(false);
    const task = vi.fn();
    await expect(
      withAdvisoryLock("sync", task, () => client),
    ).resolves.toBeNull();
    expect(task).not.toHaveBeenCalled();
    expect(events).toEqual(["connect", "acquire", "end"]);
  });
});
