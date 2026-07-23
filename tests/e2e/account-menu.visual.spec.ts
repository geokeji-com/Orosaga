import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  expect((await context.request.post("/auth/dev-login")).ok()).toBeTruthy();
});

for (const target of [
  {
    name: "portal-desktop",
    route: "/",
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: "portal-mobile",
    route: "/",
    viewport: { width: 320, height: 700 },
  },
  {
    name: "admin-desktop",
    route: "/admin",
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: "admin-mobile",
    route: "/admin",
    viewport: { width: 390, height: 844 },
  },
] as const) {
  test(`${target.name} account menu`, async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));
    await page.setViewportSize(target.viewport);
    await page.goto(target.route);
    const trigger = page.getByRole("button", {
      name: "账户：本地管理员",
    });
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByLabel("当前账户")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content: "main { visibility: hidden !important; }",
    });
    await expect(page).toHaveScreenshot(`${target.name}-account-menu.png`, {
      fullPage: false,
      animations: "disabled",
    });
    expect(browserErrors).toEqual([]);
  });
}
