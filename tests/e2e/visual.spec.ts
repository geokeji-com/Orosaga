import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  expect((await context.request.post("/auth/dev-login")).ok()).toBeTruthy();
});

const pages = [
  { name: "home", route: "/", heading: /Orosaga/ },
  { name: "company", route: "/company", heading: /关于移山科技/ },
  {
    name: "organization",
    route: "/organization",
    heading: /找到一起把事情做好的人/,
  },
  { name: "systems", route: "/systems", heading: /先知道在哪做/ },
  { name: "workflow", route: "/workflow", heading: /把一次项目/ },
  { name: "camps", route: "/camps", heading: /沿着山路/ },
] as const;

for (const viewport of [
  { name: "desktop-1440", width: 1440, height: 1000 },
  { name: "desktop-1024", width: 1024, height: 900 },
  { name: "tablet-768", width: 768, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 700 },
]) {
  for (const target of pages) {
    test(`${target.name} visual baseline ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(target.route);
      await expect(
        page.getByRole("heading", { name: target.heading }).first(),
      ).toBeVisible();
      await expect(page).toHaveScreenshot(
        `${target.name}-${viewport.name}.png`,
        {
          fullPage: true,
          animations: "disabled",
          mask:
            target.name === "company" ? [page.locator(".company-version")] : [],
        },
      );
    });
  }
}
