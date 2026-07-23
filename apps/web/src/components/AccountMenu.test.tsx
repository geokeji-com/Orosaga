// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { SessionUser } from "@orosaga/contracts";
import { ApiError, api } from "../lib/api";
import { AccountMenu } from "./AccountMenu";

const user: SessionUser = {
  id: "00000000-0000-4000-8000-000000000001",
  feishuOpenId: "ou_private_identifier",
  displayName: "李泽辰",
  role: "ADMIN",
  status: "ACTIVE",
  permissions: [],
  csrfToken: "csrf",
};

vi.mock("../auth/AuthGate", () => ({
  useMe: () => ({ data: user }),
}));

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return { ...actual, api: vi.fn() };
});

function renderMenu(client = new QueryClient()) {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<AccountMenu />} />
          <Route path="/login" element={<p>登录页</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

describe("AccountMenu", () => {
  beforeEach(() => {
    vi.mocked(api).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the current person and localized role without open_id", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "账户：李泽辰" }));
    expect(screen.getAllByText("李泽辰")).toHaveLength(2);
    expect(screen.getByText("管理员")).toBeVisible();
    expect(screen.queryByText("ou_private_identifier")).not.toBeInTheDocument();
  });

  it("closes with Escape and restores focus", () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: "账户：李泽辰" });
    fireEvent.click(trigger);
    expect(screen.getByLabelText("当前账户")).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByLabelText("当前账户")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes when the user presses outside the disclosure", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "账户：李泽辰" }));
    expect(screen.getByLabelText("当前账户")).toBeVisible();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByLabelText("当前账户")).not.toBeInTheDocument();
  });

  it.each([
    { name: "successful logout", result: () => Promise.resolve(undefined) },
    {
      name: "already expired session",
      result: () =>
        Promise.reject(new ApiError(401, "UNAUTHORIZED", "expired")),
    },
  ])("clears protected cache after $name", async ({ result }) => {
    const client = new QueryClient();
    client.setQueryData(["protected"], { employee: "private" });
    vi.mocked(api).mockReturnValueOnce(result());
    renderMenu(client);

    fireEvent.click(screen.getByRole("button", { name: "账户：李泽辰" }));
    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

    expect(await screen.findByText("登录页")).toBeVisible();
    expect(client.getQueryData(["protected"])).toBeUndefined();
    expect(api).toHaveBeenCalledWith("/api/v1/logout", { method: "POST" });
  });

  it("prevents duplicate logout and keeps the session on failure", async () => {
    let rejectRequest: ((reason: unknown) => void) | undefined;
    vi.mocked(api).mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectRequest = reject;
      }),
    );
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: "账户：李泽辰" }));
    const logout = screen.getByRole("button", { name: "退出登录" });
    fireEvent.click(logout);
    fireEvent.click(logout);
    expect(api).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "正在退出…" })).toBeDisabled();

    rejectRequest?.(new ApiError(500, "INTERNAL_ERROR", "sensitive detail"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "退出失败，请稍后重试。",
      ),
    );
    expect(screen.getAllByText("李泽辰")).toHaveLength(2);
    expect(screen.queryByText("sensitive detail")).not.toBeInTheDocument();
  });
});
