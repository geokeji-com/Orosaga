import { describe, expect, it, vi } from "vitest";
import {
  isPrivateIpAddress,
  requirePrivateDatabaseAddresses,
} from "./database-network.js";

describe("database network policy", () => {
  it.each([
    "10.2.3.4",
    "172.16.0.1",
    "172.31.255.254",
    "192.168.10.8",
    "fd00::1",
    "::ffff:10.0.0.7",
  ])("accepts private address %s", (address) => {
    expect(isPrivateIpAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "172.32.0.1", "127.0.0.1", "2001:4860::1"])(
    "rejects non-private address %s",
    (address) => {
      expect(isPrivateIpAddress(address)).toBe(false);
    },
  );

  it("requires every resolved address to be private", async () => {
    const resolve = vi.fn().mockResolvedValue([
      { address: "10.0.0.4", family: 4 },
      { address: "203.0.113.8", family: 4 },
    ]);
    await expect(
      requirePrivateDatabaseAddresses("db.example.com", resolve),
    ).rejects.toThrow("resolved outside");
  });

  it("returns a private-only resolution", async () => {
    const addresses = [{ address: "10.0.0.4", family: 4 }];
    await expect(
      requirePrivateDatabaseAddresses(
        "db.pg.rds.aliyuncs.com",
        vi.fn().mockResolvedValue(addresses),
      ),
    ).resolves.toEqual(addresses);
  });
});
