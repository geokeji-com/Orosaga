// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";
import { replaceWithLogin } from "./session-navigation";

vi.mock("./session-navigation", () => ({
  replaceWithLogin: vi.fn(),
}));

function response(status: number) {
  return new Response(
    JSON.stringify({ code: `HTTP_${status}`, message: "request failed" }),
    {
      status,
      headers: { "content-type": "application/json" },
    },
  );
}

describe("api unauthorized navigation", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/company?section=proof#case");
    vi.mocked(replaceWithLogin).mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("replaces a protected page with login when any API returns 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(401)));

    await expect(api("/api/v1/pages/company")).rejects.toBeInstanceOf(ApiError);
    expect(replaceWithLogin).toHaveBeenCalledOnce();
    expect(replaceWithLogin).toHaveBeenCalledWith(
      "/company?section=proof#case",
    );
  });

  it("does not redirect non-401 failures or a request already on login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(500)));
    await expect(api("/api/v1/pages/company")).rejects.toBeInstanceOf(ApiError);
    expect(replaceWithLogin).not.toHaveBeenCalled();

    window.history.replaceState({}, "", "/login");
    vi.mocked(fetch).mockResolvedValueOnce(response(401));
    await expect(api("/api/v1/me")).rejects.toBeInstanceOf(ApiError);
    expect(replaceWithLogin).not.toHaveBeenCalled();
  });
});
