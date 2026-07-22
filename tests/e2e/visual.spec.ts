import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, page }) => {
  await page.addInitScript(() => {
    const OriginalDate = Date;
    const fixed = new OriginalDate("2026-06-23T04:00:00.000Z").valueOf();
    class FixedDate extends OriginalDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        super(...(args.length ? args : [fixed]));
      }
      static now() {
        return fixed;
      }
    }
    globalThis.Date = FixedDate as DateConstructor;
  });
  await page.route("**/api/v1/widgets/weather", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        available: true,
        current: { temperature_2m: 24, weather_code: 1 },
      }),
    }),
  );
  expect((await context.request.post("/auth/dev-login")).ok()).toBeTruthy();
});

async function waitForImages(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map(
        (image) =>
          image.complete ||
          new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

async function normalizeDynamicContent(
  page: import("@playwright/test").Page,
  name: string,
) {
  if (name === "organization") {
    await page.locator(".person-copy strong").evaluateAll((nodes) =>
      nodes.forEach((node, index) => {
        node.textContent = `示例成员 ${String(index + 1).padStart(2, "0")}`;
      }),
    );
    await page.locator(".person-copy small").evaluateAll(
      (nodes, role) =>
        nodes.forEach((node) => {
          node.textContent = role;
        }),
      "示例岗位",
    );
    await page.locator(".person-avatar").evaluateAll((nodes) =>
      nodes.forEach((node) => {
        node.innerHTML = '<span class="initials-avatar-content">成员</span>';
      }),
    );
  }
  if (name === "camps") {
    await page.locator(".camp-card strong").evaluateAll((nodes) =>
      nodes.forEach((node, index) => {
        node.textContent = `示例营地 ${String(index + 1).padStart(2, "0")}`;
      }),
    );
  }
}

const pages = [
  { name: "home", route: "/", heading: /Orosaga/ },
  { name: "company", route: "/company", heading: /先把移山科技说清楚/ },
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
      await normalizeDynamicContent(page, target.name);
      await waitForImages(page);
      await expect
        .poll(() =>
          page
            .locator("img")
            .evaluateAll((images) =>
              images.every((image) => image.complete && image.naturalWidth > 0),
            ),
        )
        .toBe(true);
      await expect(page).toHaveScreenshot(
        `${target.name}-${viewport.name}.png`,
        {
          fullPage: true,
          animations: "disabled",
        },
      );
    });
  }
}
