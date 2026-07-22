import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("anonymous visitors are redirected before protected pages mount", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/company",
    "/organization",
    "/systems",
    "/workflow",
    "/camps",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL((url) => {
      return (
        url.pathname === "/login" && url.searchParams.get("returnTo") === route
      );
    });
    await expect(
      page.getByRole("link", { name: "使用飞书登录" }),
    ).toBeVisible();
    await expect(
      page.locator(".company-page, .organization-page, .camps-page"),
    ).toHaveCount(0);
  }
  const apiResponse = await page.request.get("/api/v1/navigation");
  expect(apiResponse.status()).toBe(401);
});

test("malicious return addresses cannot become an open redirect", async ({
  request,
}) => {
  const response = await request.get(
    `/auth/feishu/login?returnTo=${encodeURIComponent("https://evil.example/path")}`,
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(302);
  expect(response.headers()["set-cookie"]).toContain("orosaga_return_to=%2F");
  expect(response.headers()["set-cookie"]).not.toContain("evil.example");
});

test("login is accessible and preserves a safe return address", async ({
  page,
}) => {
  await page.goto("/login?returnTo=%2Forganization%3Fdepartment%3Dtest");
  const login = page.getByRole("link", { name: "使用飞书登录" });
  await expect(login).toHaveAttribute(
    "href",
    "/auth/feishu/login?returnTo=%2Forganization%3Fdepartment%3Dtest",
  );
  await login.focus();
  await expect(login).toBeFocused();
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
});
