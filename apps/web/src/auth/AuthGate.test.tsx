// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { SessionUser } from "@orosaga/contracts";
import { ApiError, api } from "../lib/api";
import { AuthGate } from "./AuthGate";

const user: SessionUser = {
  id: "00000000-0000-4000-8000-000000000001",
  feishuOpenId: "ou_private_identifier",
  displayName: "李泽辰",
  role: "ADMIN",
  status: "ACTIVE",
  permissions: [],
  csrfToken: "csrf",
};

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return { ...actual, api: vi.fn() };
});

function renderGate(client: QueryClient) {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/company"]}>
        <Routes>
          <Route element={<AuthGate />}>
            <Route path="/company" element={<p>受保护内容</p>} />
          </Route>
          <Route path="/login" element={<p>登录页</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AuthGate history protection", () => {
  beforeEach(() => vi.mocked(api).mockReset());
  afterEach(cleanup);

  it("revalidates cached identity before mounting a protected route", async () => {
    const client = new QueryClient();
    client.setQueryData(["me"], user);
    let rejectRequest: ((reason: unknown) => void) | undefined;
    vi.mocked(api).mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectRequest = reject;
      }),
    );

    renderGate(client);
    expect(screen.getByText("正在进入山海经…")).toBeVisible();
    expect(screen.queryByText("受保护内容")).not.toBeInTheDocument();

    rejectRequest?.(new ApiError(401, "UNAUTHORIZED", "expired"));
    expect(await screen.findByText("登录页")).toBeVisible();
  });

  it.each([true, false])(
    "revalidates a page restored from browser history (persisted=%s)",
    async (persisted) => {
      const client = new QueryClient();
      vi.mocked(api).mockResolvedValueOnce(user);
      renderGate(client);
      expect(await screen.findByText("受保护内容")).toBeVisible();

      let rejectRequest: ((reason: unknown) => void) | undefined;
      vi.mocked(api).mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectRequest = reject;
        }),
      );
      const pageShow = new Event("pageshow");
      Object.defineProperty(pageShow, "persisted", { value: persisted });
      window.dispatchEvent(pageShow);

      await waitFor(() =>
        expect(screen.getByText("正在进入山海经…")).toBeVisible(),
      );
      expect(screen.queryByText("受保护内容")).not.toBeInTheDocument();
      rejectRequest?.(new ApiError(401, "UNAUTHORIZED", "expired"));
      expect(await screen.findByText("登录页")).toBeVisible();
    },
  );
});
