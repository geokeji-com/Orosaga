import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  assessmentAttempt,
  assessmentQuestion,
  assessmentReportPayload,
  assessmentUser,
} from "./assessment.fixtures";

test.beforeEach(async ({ page }) => {
  const answers = new Map<string, string>();
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const fulfill = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path === "/api/v1/me") return fulfill(assessmentUser);
    if (path === "/api/v1/assessments/geo-foundations")
      return fulfill({
        assessmentSlug: "geo-foundations",
        title: "GEO 基础能力测评",
        enabled: true,
        status: "AVAILABLE",
        cycleKey: "2026-H2",
        version: "1.0.0",
        dailyLimit: 1,
        maxAttempts: 3,
        attemptsUsed: 1,
        attemptsRemaining: 2,
        attemptedToday: false,
        nextEligibleAt: null,
        activeAttemptId: null,
        activeDeadlineAt: null,
        latestScore: 68,
        bestScore: 68,
        passed: false,
        passScore: 80,
        history: [],
      });
    if (path === "/api/v1/assessments/geo-foundations/attempts")
      return fulfill(assessmentAttempt);
    if (/\/questions\/\d+$/.test(path)) {
      const position = Number(path.split("/").at(-1));
      const question = assessmentQuestion(position);
      const selected = answers.get(question.id) as
        "a" | "b" | "c" | "d" | undefined;
      return fulfill({
        ...question,
        selectedOptionId: selected ?? null,
        answerRevision: selected ? 1 : 0,
      });
    }
    if (/\/answers\//.test(path)) {
      const questionId = path.split("/").at(-1)!;
      const body = request.postDataJSON() as { selectedOptionId: string };
      answers.set(questionId, body.selectedOptionId);
      return fulfill({
        questionId,
        selectedOptionId: body.selectedOptionId,
        revision: 1,
        changeCount: 0,
        answeredCount: 13,
      });
    }
    if (path.endsWith("/review"))
      return fulfill({
        attempt: { ...assessmentAttempt, answeredCount: 42 },
        items: Array.from({ length: 50 }, (_, index) => ({
          questionId: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          position: index + 1,
          answered: index < 42,
        })),
      });
    if (path.endsWith("/submit"))
      return fulfill({
        ...assessmentAttempt,
        status: "SUBMITTED",
        score: 78,
        submittedAt: "2026-08-03T01:28:00.000Z",
      });
    if (path.endsWith("/report"))
      return fulfill({
        attempt: {
          ...assessmentAttempt,
          attemptNumber: 2,
          status: "SUBMITTED",
          score: 78,
          submittedAt: "2026-08-03T01:28:00.000Z",
        },
        status: "READY",
        failureCode: null,
        payload: assessmentReportPayload,
        voided: false,
      });
    if (path === "/api/v1/admin/assessments")
      return fulfill([
        {
          id: "30000000-0000-4000-8000-000000000001",
          assessmentSlug: "geo-foundations",
          title: "GEO 基础能力测评",
          enabled: true,
          cycleKey: "2026-H2",
          version: "1.0.0",
          status: "VALIDATED",
          sourceReviewStatus: "CURRENT",
          contentReviewStatus: "APPROVED",
          angoffStatus: "APPROVED",
          pilotStatus: "APPROVED",
          questionCount: 50,
          contentHash: "a".repeat(64),
          passScore: 80,
          reviewDueAt: "2027-02-03T00:00:00.000Z",
          publishedAt: null,
        },
      ]);
    if (path === "/api/v1/admin/assessment-attempts")
      return fulfill([
        {
          id: assessmentAttempt.id,
          employee: "示例员工",
          assessment: "GEO 基础能力测评",
          version: "1.0.0",
          attemptNumber: 1,
          status: "SUBMITTED",
          score: 78,
          firstScore: 78,
          bestScore: 78,
          passed: false,
          startedAt: assessmentAttempt.startedAt,
          submittedAt: "2026-08-03T01:28:00.000Z",
        },
      ]);
    if (path === `/api/v1/assessment-attempts/${assessmentAttempt.id}`)
      return fulfill({
        ...assessmentAttempt,
        assessmentSlug: "geo-foundations",
        title: "GEO 基础能力测评",
        passScore: 80,
      });
    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "NOT_FOUND", message: "测试路由未定义" }),
    });
  });
});

test("employee can start, answer with keyboard and review the answer sheet", async ({
  page,
}) => {
  await page.goto("/assessment/geo-foundations");
  await expect(
    page.getByRole("heading", { name: "GEO 基础能力测评" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /开始测评/ }).click();
  await expect(
    page.getByRole("dialog", { name: "确认开始测评？" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "确认开始" }).click();
  await expect(page).toHaveURL(/\/question\/1$/);
  await expect(
    page.getByRole("heading", { name: /客户报告准备引用/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /下一题/ })).toBeDisabled();
  await page.keyboard.press("2");
  await expect(page.getByText("答案已保存")).toBeVisible();
  await expect(page.getByRole("button", { name: /下一题/ })).toBeEnabled();
  await page.getByRole("link", { name: "答题卡" }).click();
  await expect(
    page.getByRole("heading", { name: "交卷前，再看一遍" }),
  ).toBeVisible();
  await expect(page.getByText("还有 8 道题未作答")).toBeVisible();
});

test("answer sheet navigation waits for the current answer to save", async ({
  page,
}) => {
  let releaseSave = () => {};
  const saveGate = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  await page.route(
    "**/api/v1/assessment-attempts/*/answers/*",
    async (route) => {
      await saveGate;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ revision: 1, answeredCount: 13 }),
      });
    },
  );
  await page.goto(
    `/assessment/geo-foundations/attempt/${assessmentAttempt.id}/question/1`,
  );
  await page.getByText("直接选择数值最高的指标作为结论").click();
  const answerSheet = page.getByRole("link", { name: "答题卡" });
  await expect(answerSheet).toHaveAttribute("aria-disabled", "true");
  await answerSheet.press("Enter");
  await expect(page).toHaveURL(/\/question\/1$/);

  releaseSave();
  await expect(page.getByText("答案已保存")).toBeVisible();
  await answerSheet.click();
  await expect(page).toHaveURL(/\/review$/);
});

test("start retry reuses the same idempotency key after a network failure", async ({
  page,
}) => {
  const keys: string[] = [];
  let attempts = 0;
  await page.route(
    "**/api/v1/assessments/geo-foundations/attempts",
    async (route) => {
      const body = route.request().postDataJSON() as { idempotencyKey: string };
      keys.push(body.idempotencyKey);
      attempts += 1;
      if (attempts === 1) return route.abort("connectionfailed");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(assessmentAttempt),
      });
    },
  );
  await page.goto("/assessment/geo-foundations");
  await page.getByRole("button", { name: /开始测评/ }).click();
  await page.getByRole("button", { name: "确认开始" }).click();
  await expect(page.getByRole("button", { name: /开始测评/ })).toBeVisible();
  await page.getByRole("button", { name: /开始测评/ }).click();
  await page.getByRole("button", { name: "确认开始" }).click();
  await expect(page).toHaveURL(/\/question\/1$/);
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});

test("confirmation dialog traps focus and restores it when closed", async ({
  page,
}) => {
  await page.goto("/assessment/geo-foundations");
  const startButton = page.getByRole("button", { name: /开始测评/ });
  await startButton.focus();
  await startButton.click();
  const dialog = page.getByRole("dialog", { name: "确认开始测评？" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "确认开始" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "再准备一下" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(startButton).toBeFocused();
});

test("failed answer save keeps the choice and can be retried in place", async ({
  page,
}) => {
  let saves = 0;
  await page.route(
    "**/api/v1/assessment-attempts/*/answers/*",
    async (route) => {
      saves += 1;
      if (saves === 1)
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            code: "TEMPORARY_FAILURE",
            message: "暂时无法保存",
          }),
        });
      const body = route.request().postDataJSON() as {
        selectedOptionId: string;
      };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          selectedOptionId: body.selectedOptionId,
          revision: 1,
          answeredCount: 13,
        }),
      });
    },
  );
  await page.goto(
    `/assessment/geo-foundations/attempt/${assessmentAttempt.id}/question/1`,
  );
  await expect(
    page.getByRole("heading", { name: /客户报告准备引用/ }),
  ).toBeVisible();
  await page.keyboard.press("2");
  await expect(
    page.getByText("保存失败，当前选择已保留，请重试"),
  ).toBeVisible();
  await expect(page.locator('input[type="radio"]').nth(1)).toBeChecked();
  await expect(page.getByRole("button", { name: /下一题/ })).toBeDisabled();
  await page.getByRole("button", { name: "重试保存" }).click();
  await expect(page.getByText("答案已保存")).toBeVisible();
  await expect(page.getByRole("button", { name: /下一题/ })).toBeEnabled();
});

test("failed submission explains the error inside the dialog and retries", async ({
  page,
}) => {
  let submissions = 0;
  await page.route(
    `**/api/v1/assessment-attempts/${assessmentAttempt.id}/submit`,
    async (route) => {
      submissions += 1;
      if (submissions === 1)
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            code: "TEMPORARY_FAILURE",
            message: "暂时无法提交，请检查网络后重试",
          }),
        });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...assessmentAttempt,
          status: "SUBMITTED",
          score: 78,
          submittedAt: "2026-08-03T01:28:00.000Z",
        }),
      });
    },
  );
  await page.goto(
    `/assessment/geo-foundations/attempt/${assessmentAttempt.id}/review`,
  );
  await page.getByRole("button", { name: "提交答卷" }).click();
  const dialog = page.getByRole("dialog", { name: "确认提交答卷？" });
  await dialog.getByRole("button", { name: "确认提交" }).click();
  await expect(
    dialog.getByRole("alert").filter({ hasText: "暂时无法提交" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "重新提交" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/assessment/geo-foundations/report/${assessmentAttempt.id}$`),
  );
});

test("diagnostic report exposes 16 charts, clickable question details and accessible content", async ({
  page,
}) => {
  await page.goto(`/assessment/geo-foundations/report/${assessmentAttempt.id}`);
  await expect(
    page.getByRole("heading", { name: "GEO 基础能力测评报告" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "从 16 个视角读取结果" }),
  ).toBeVisible();
  await expect(page.locator("figure[data-chart-id]")).toHaveCount(16);
  await expect(page.locator("figure details table")).toHaveCount(16);

  const incorrectQuestion = page.getByRole("button", {
    name: /第 1 题，回答错误/,
  });
  await incorrectQuestion.click();
  const dialog = page.getByRole("dialog", {
    name: /第 1 题：客户报告准备引用 GEO 数据结论时/,
  });
  await expect(dialog).toBeVisible();
  const answerSummary = dialog.locator(
    ".assessment-question-answer-summary > div",
  );
  await expect(answerSummary.nth(0)).toContainText("你的答案2");
  await expect(answerSummary.nth(1)).toContainText("标准答案1");
  await expect(
    dialog.locator(".assessment-question-detail-options li"),
  ).toHaveCount(4);
  await expect(
    dialog.getByText("数据结论应由字段、分母、样本范围和限制条件共同限定。"),
  ).toBeVisible();
  const dialogResults = await new AxeBuilder({ page })
    .include("[role=dialog]")
    .analyze();
  expect(
    dialogResults.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(incorrectQuestion).toBeFocused();

  const correctQuestion = page.getByRole("button", {
    name: /第 2 题，回答正确/,
  });
  await correctQuestion.click();
  await expect(page.getByRole("dialog")).toContainText("回答正确");
  await page.getByRole("button", { name: "关闭题目详情" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await incorrectQuestion.click();
  const mobileDialog = page.getByRole("dialog");
  const mobileDialogBox = await mobileDialog.boundingBox();
  expect(mobileDialogBox).not.toBeNull();
  expect(mobileDialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(mobileDialogBox!.x + mobileDialogBox!.width).toBeLessThanOrEqual(390);
  await expect
    .poll(() =>
      mobileDialog.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    )
    .toBe("rgb(255, 255, 255)");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "答案、原理与业务应用" }),
  ).toHaveCount(0);

  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
});

test("assessment layouts remain usable across supported widths and in print", async ({
  page,
}) => {
  const paths = [
    "/assessment/geo-foundations",
    `/assessment/geo-foundations/attempt/${assessmentAttempt.id}/question/1`,
    `/assessment/geo-foundations/report/${assessmentAttempt.id}`,
  ];
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      const layout = await page.evaluate(() => ({
        fits:
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
        overflowing: [...document.querySelectorAll<HTMLElement>("body *")]
          .filter(
            (element) =>
              element.getBoundingClientRect().right > window.innerWidth + 1,
          )
          .slice(0, 8)
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: element.className,
            right: Math.round(element.getBoundingClientRect().right),
          })),
      }));
      expect(
        layout.fits,
        `${path} should not overflow at ${width}px: ${JSON.stringify(layout.overflowing)}`,
      ).toBe(true);
    }
  }
  await page.goto(
    `/assessment/geo-foundations/report/${assessmentAttempt.id}/print`,
  );
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("figure[data-chart-id]")).toHaveCount(16);
  await expect(page.locator(".assessment-topbar")).toBeHidden();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.goto(
    `/assessment/geo-foundations/report/${assessmentAttempt.id}/print/answers`,
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".assessment-analysis-body").first()).toBeVisible();
  await expect(
    page.locator(".assessment-analysis-options li > span").first(),
  ).toHaveText("1");
});

test("admin sees release gates before publication", async ({ page }) => {
  await page.goto("/admin/assessments");
  await expect(
    page.getByRole("heading", { name: "题库发布与测评记录" }),
  ).toBeVisible();
  await expect(page.getByText("机器校验通过")).toBeVisible();
  await expect(page.getByText("2027/2/3")).toBeVisible();
  await expect(page.getByRole("cell", { name: "78" })).toHaveCount(3);
  await expect(page.getByRole("button", { name: "发布" })).toBeEnabled();
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
});

test("admin publication confirmation uses the accessible product dialog", async ({
  page,
}) => {
  await page.goto("/admin/assessments");
  const publishButton = page.getByRole("button", { name: "发布" });
  await publishButton.click();
  const dialog = page.getByRole("dialog", { name: "发布题库版本？" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(publishButton).toBeFocused();
});

test("assessment key surfaces keep their visual hierarchy", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/assessment/geo-foundations");
  await expect(
    page.getByRole("heading", { name: "GEO 基础能力测评" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("assessment-intro-desktop.png");

  await page.goto(
    `/assessment/geo-foundations/attempt/${assessmentAttempt.id}/question/1`,
  );
  await expect(
    page.getByRole("heading", { name: /客户报告准备引用/ }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("assessment-question-desktop.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    `/assessment/geo-foundations/attempt/${assessmentAttempt.id}/review`,
  );
  await expect(
    page.getByRole("heading", { name: "交卷前，再看一遍" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("assessment-review-mobile.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/assessment/geo-foundations/report/${assessmentAttempt.id}`);
  await expect(
    page.getByRole("heading", { name: "GEO 基础能力测评报告" }),
  ).toBeVisible();
  await expect(page.locator(".assessment-shell")).toHaveClass(
    /is-report-canvas/,
  );
  await expect
    .poll(() =>
      page
        .locator(".assessment-shell")
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .toBe("rgb(255, 255, 255)");
  await expect
    .poll(() =>
      page.evaluate(() => getComputedStyle(document.body, "::before").display),
    )
    .toBe("none");
  await expect(page).toHaveScreenshot("assessment-report-desktop.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page).toHaveScreenshot("assessment-report-mobile.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  for (const chartId of [
    "result",
    "dimensions",
    "timing",
    "correctness-time",
    "item-map",
    "dimension-change",
  ]) {
    await expect(
      page.locator(`figure[data-chart-id="${chartId}"]`),
    ).toHaveScreenshot(`assessment-chart-${chartId}.png`);
  }

  const resultMapQuestion = page.getByRole("button", {
    name: /第 1 题，回答错误/,
  });
  await resultMapQuestion.click();
  await expect(page.getByRole("dialog")).toHaveScreenshot(
    "assessment-question-detail-desktop.png",
  );
  await page.keyboard.press("Escape");

  await page.goto("/admin/assessments");
  await expect(
    page.getByRole("heading", { name: "题库发布与测评记录" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("assessment-admin-desktop.png", {
    maxDiffPixelRatio: 0.002,
  });
});
