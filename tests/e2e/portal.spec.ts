import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ context }) => {
  const response = await context.request.post("/auth/dev-login");
  expect(response.ok()).toBeTruthy();
});

test("protected portal routes and real 404 work", async ({ page }) => {
  const routes = [
    ["/", "Orosaga"],
    ["/company", "先把移山科技说清楚"],
    ["/organization", "找到一起把事情做好的人"],
    ["/systems", "先知道在哪做"],
    ["/workflow", "把一次项目"],
    ["/camps", "沿着山路"],
  ] as const;
  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: new RegExp(heading) }).first(),
    ).toBeVisible();
  }
  const search = await page.request.get("/api/v1/search?q=示例");
  expect(search.ok()).toBeTruthy();
  await page.goto("/does-not-exist");
  await expect(
    page.getByRole("heading", { name: "没有找到这条山路" }),
  ).toBeVisible();
});

test("employee profile modal supports keyboard close", async ({ page }) => {
  await page.goto("/organization");
  await page.locator(".person-row").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("homepage has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
});

test("admin editor publishes the current structured page", async ({ page }) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "公司页", exact: true }),
  ).toBeVisible();
  const publish = page.getByRole("button", { name: /立即发布版本/ });
  const before = await publish.textContent();
  await publish.click();
  await expect(publish).not.toHaveText(before ?? "");
  await expect(page.getByText(/当前版本：/)).toBeVisible();
});
