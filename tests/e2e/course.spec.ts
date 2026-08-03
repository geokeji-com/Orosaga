import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  installCourseRoutes,
  modelLayouts,
  modelNodeCounts,
  modelTitles,
} from "./course.fixtures";

async function expectDesktopLearningStage(page: Page) {
  const main = page.locator(".course-lesson-main");
  const stage = page.locator(".course-lesson-wrap");
  const actionDock = page.getByRole("group", { name: "本步学习操作" });
  const stageBox = await stage.boundingBox();
  const actionDockBox = await actionDock.boundingBox();

  if (!stageBox || !actionDockBox) throw new Error("学习屏幕尚未完成布局");

  expect(stageBox.width / stageBox.height).toBeCloseTo(1.6, 1);
  expect(actionDockBox.y + actionDockBox.height).toBeLessThanOrEqual(
    stageBox.y + stageBox.height + 1,
  );
  expect(
    await main.evaluate(
      (element) => element.scrollHeight === element.clientHeight,
    ),
  ).toBe(true);
}

function actionButton(page: Page) {
  return page.getByRole("group", { name: "本步学习操作" }).getByRole("button");
}

test("pilot learners without access see an explicit availability state", async ({
  page,
}) => {
  await installCourseRoutes(page, { accessDenied: true });
  await page.goto("/courses");

  await expect(
    page.getByRole("heading", { name: "课程正在授权试学" }),
  ).toBeVisible();
  await expect(page.getByText("当前试学范围正在逐步开放")).toBeVisible();
  await expect(page.getByRole("link", { name: "返回首页" })).toBeVisible();
});

async function activateScrollAndWait(
  page: Page,
  activate: () => Promise<unknown>,
) {
  const signal = "__orosagaCourseScrollEnded";
  await page.locator(".course-lesson-content").evaluate((element, key) => {
    Reflect.set(window, key, false);
    element.addEventListener(
      "scrollend",
      () => {
        Reflect.set(window, key, true);
      },
      { once: true },
    );
  }, signal);
  await activate();
  await expect
    .poll(() => page.evaluate((key) => Reflect.get(window, key), signal))
    .toBe(true);
}

async function revealAction(page: Page, expectedName: RegExp) {
  for (let index = 0; index < 8; index += 1) {
    const button = actionButton(page);
    const name = (await button.textContent()) ?? "";
    if (expectedName.test(name)) return button;
    if (/继续往下看|继续看完整解析/.test(name)) {
      await activateScrollAndWait(page, () => button.click());
      continue;
    }
    break;
  }
  await expect(actionButton(page)).toHaveAccessibleName(expectedName);
  return actionButton(page);
}

test("learner enters from the learning center and receives exercise feedback", async ({
  page,
}) => {
  const routes = await installCourseRoutes(page);
  await page.goto("/courses");

  await expect(page.getByRole("heading", { name: "学习中心" })).toBeVisible();
  await page.getByRole("link", { name: "查看课程" }).click();
  await expect(
    page.getByRole("heading", { name: "从 AI 回答到 GEO 交付" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /开始学习/ }).click();

  await expect(page).toHaveURL(/lesson-01-story$/);
  await expect(
    page.getByRole("heading", { name: "澄屿项目，第 1 个现场" }),
  ).toBeVisible();
  const learningSections = page.locator(".course-learning-section");
  await expect(learningSections).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await expect(learningSections.nth(index)).toHaveCSS(
      "border-left-width",
      "1px",
    );
  }
  await expectDesktopLearningStage(page);
  expect(
    await page
      .locator(".course-lesson-content")
      .evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
  ).toBe(true);
  await expect(actionButton(page)).toHaveAccessibleName(
    "现场我看懂了，看看下一种方法",
  );
  await actionButton(page).click();
  await expect(page).toHaveURL(/lesson-01-model$/);
  await expect(page.getByText(modelTitles[0]!, { exact: true })).toBeVisible();
  await expectDesktopLearningStage(page);
  await (await revealAction(page, /方法我理解了，来做判断/)).click();
  await expect(page).toHaveURL(/lesson-01-practice$/);
  await expect(actionButton(page)).toHaveAccessibleName("先选一个答案");
  await expect(actionButton(page)).toBeDisabled();
  expect(
    await page
      .locator(".course-lesson-content")
      .evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
  ).toBe(true);

  await page.getByText("先写一篇长文再补证据").click();
  await expect(actionButton(page)).toHaveAccessibleName("提交我的判断");
  await actionButton(page).click();
  await expect(page.getByText("再想一想")).toBeVisible();
  await expect(page.getByText("详细分析")).toBeVisible();
  await expect(page.locator(".course-feedback-title")).toBeFocused();
  await expect(page.locator(".course-exercise fieldset")).toHaveAttribute(
    "disabled",
    "",
  );
  await expectDesktopLearningStage(page);
  await expect
    .poll(() =>
      page
        .locator(".course-lesson-content")
        .evaluate((element) => element.scrollTop),
    )
    .toBeGreaterThan(0);

  await (await revealAction(page, /我再想一次，重新选择/)).click();
  await expect(page.locator(".course-exercise fieldset")).toBeEnabled();
  await page.getByText("确认场景、证据和验收，再安排交付").click();
  await expect(actionButton(page)).toHaveAccessibleName("提交我的新判断");
  await actionButton(page).click();
  await expect(page.getByText("答对了")).toBeVisible();
  expect(routes.exerciseRequests).toHaveLength(2);
  expect(routes.exerciseRequests[0]?.operationId).not.toBe(
    routes.exerciseRequests[1]?.operationId,
  );
  await (await revealAction(page, /解析我读完了，进入下一节/)).click();
  await expect(page).toHaveURL(/lesson-02-story$/);

  await page.goto(
    "/courses/geo-foundations/lesson/lesson-01/step/lesson-01-practice",
  );
  await expect(page.getByText("本节练习已经完成")).toBeVisible();
  await expect(actionButton(page)).toHaveAccessibleName(
    "本节已完成，继续下一节",
  );
});

test("progress survives refresh and mobile outline can be opened", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installCourseRoutes(page, {
    enrolled: true,
    completedSteps: ["lesson-01-story"],
  });
  await page.goto(
    "/courses/geo-foundations/lesson/lesson-01/step/lesson-01-model",
  );
  await expect(page.getByText(modelTitles[0]!, { exact: true })).toBeVisible();
  expect(
    await page
      .locator(".course-model")
      .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBe(true);
  await expect(page.locator(".course-lesson-wrap")).toHaveCSS(
    "aspect-ratio",
    "auto",
  );
  await page.reload();
  await expect(page.getByText(modelTitles[0]!, { exact: true })).toBeVisible();

  const outline = page.locator("#course-outline");
  const outlineTrigger = page.getByRole("button", {
    name: "课程大纲",
    exact: true,
  });
  await expect(outline).toHaveAttribute("inert", "");
  await outlineTrigger.click();
  await expect(page.getByRole("dialog", { name: "课程大纲" })).toBeVisible();
  await expect(outline).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  const activeLesson = outline.locator(
    ".course-outline-lesson-group.is-active",
  );
  await expect(activeLesson.locator(".course-outline-steps > li")).toHaveCount(
    3,
  );
  await expect(
    activeLesson.locator(".course-outline-step.is-completed"),
  ).toHaveCount(1);
  await expect(
    activeLesson.locator(".course-outline-step.is-locked"),
  ).toHaveCount(1);
  await expect(activeLesson.locator('a[aria-current="step"]')).toContainText(
    "方法",
  );
  await expect(
    page.getByRole("button", { name: "关闭课程大纲", exact: true }),
  ).toBeFocused();
  const visibleChapterSummaries = outline.locator("summary:visible");
  await page.keyboard.press("Shift+Tab");
  await expect(visibleChapterSummaries.last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "关闭课程大纲", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(outline).not.toHaveClass(/is-open/);
  await expect(outline).toHaveAttribute("inert", "");
  await expect(outlineTrigger).toBeFocused();

  await outlineTrigger.click();
  await expect(
    page.getByRole("navigation", { name: "课程章节" }),
  ).toBeVisible();
  await expect(page.getByText("02").first()).toBeVisible();

  const accessibility = await new AxeBuilder({ page })
    .include(".course-workspace")
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("all visual models keep a readable order on narrow screens", async ({
  page,
}) => {
  test.slow();
  await installCourseRoutes(page, { enrolled: true });

  for (const width of [320, 375, 600, 768]) {
    await page.setViewportSize({ width, height: 812 });
    for (let lesson = 1; lesson <= 20; lesson += 1) {
      const key = String(lesson).padStart(2, "0");
      await page.goto(
        `/courses/geo-foundations/lesson/lesson-${key}/step/lesson-${key}-model`,
      );

      const model = page.locator(".course-model");
      const nodes = model.locator(".course-model-stage li");
      await expect(model).toHaveAttribute(
        "data-model-layout",
        modelLayouts[lesson - 1]!,
      );
      await expect(nodes).toHaveCount(modelNodeCounts[lesson - 1]!);
      expect(
        await model.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
      expect(
        await model
          .locator(".course-model-stage")
          .evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1,
          ),
      ).toBe(true);

      const first = await nodes.first().boundingBox();
      const last = await nodes.last().boundingBox();
      if (!first || !last) throw new Error("移动端模型节点尚未完成布局");
      if (width <= 600) expect(last.y).toBeGreaterThan(first.y);
      if (width >= 768) {
        const modelBox = await model.boundingBox();
        expect(modelBox?.height).toBeLessThanOrEqual(450);
      }
    }
  }

  const accessibility = await new AxeBuilder({ page })
    .include(".course-model")
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("compact desktop keeps the learning stage and moves the outline to a drawer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await installCourseRoutes(page, { enrolled: true });
  await page.goto(
    "/courses/geo-foundations/lesson/lesson-01/step/lesson-01-story",
  );

  await expectDesktopLearningStage(page);
  await expect(
    page.getByRole("button", { name: "课程大纲", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator(".course-lesson-content")
      .evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
  ).toBe(true);

  await page.getByRole("button", { name: "课程大纲", exact: true }).click();
  await expect(page.locator("#course-outline")).toHaveClass(/is-open/);
  await expect(
    page.getByRole("navigation", { name: "课程章节" }),
  ).toBeVisible();
});

test("Space follows the staged learning action without exposing the route focus target", async ({
  page,
}) => {
  const routes = await installCourseRoutes(page, { enrolled: true });
  await page.goto(
    "/courses/geo-foundations/lesson/lesson-01/step/lesson-01-story",
  );

  const lessonTitle = page.getByRole("heading", { level: 1 });
  await expect(lessonTitle).toBeFocused();
  await expect(lessonTitle).toHaveCSS("outline-style", "none");
  await expect(actionButton(page)).toHaveAttribute(
    "aria-keyshortcuts",
    "Space",
  );
  await expect(
    page.getByRole("group", { name: "本步学习操作" }).getByText("空格"),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/lesson-01-story$/);
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/lesson-01-model$/);
  for (let index = 0; index < 8; index += 1) {
    const name = (await actionButton(page).textContent()) ?? "";
    if (/继续往下看/.test(name)) {
      await activateScrollAndWait(page, () => page.keyboard.press("Space"));
      continue;
    }
    await page.keyboard.press("Space");
    if (!/继续往下看/.test(name)) break;
  }
  await expect(page).toHaveURL(/lesson-01-practice$/);

  await page.keyboard.press("Space");
  expect(routes.exerciseRequests).toHaveLength(0);
  const correctOption = page.getByRole("radio", {
    name: /确认场景、证据和验收，再安排交付/,
  });
  await correctOption.check();
  await correctOption.focus();
  await page.keyboard.press("Space");
  expect(routes.exerciseRequests).toHaveLength(0);
  await lessonTitle.focus();
  await page.keyboard.press("Space");
  await expect(page.getByText("答对了")).toBeVisible();
  expect(routes.exerciseRequests).toHaveLength(1);

  for (let index = 0; index < 8; index += 1) {
    const name = (await actionButton(page).textContent()) ?? "";
    if (!/继续看完整解析/.test(name)) break;
    await activateScrollAndWait(page, () => page.keyboard.press("Space"));
  }
  await expect(actionButton(page)).toHaveAccessibleName(
    "解析我读完了，进入下一节",
  );
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/lesson-02-story$/);
});

test("small learning screens reveal unread content before saving", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await installCourseRoutes(page, { enrolled: true });
  await page.goto(
    "/courses/geo-foundations/lesson/lesson-01/step/lesson-01-story",
  );

  await expect(actionButton(page)).toHaveAccessibleName("继续往下看");
  const content = page.locator(".course-lesson-content");
  const before = await content.evaluate((element) => element.scrollTop);
  await activateScrollAndWait(page, () => actionButton(page).click());
  expect(
    await content.evaluate((element) => element.scrollTop),
  ).toBeGreaterThan(before);
  await expect(page).toHaveURL(/lesson-01-story$/);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  const continueButton = await revealAction(page, /现场我看懂了/);
  await continueButton.click();
  await expect(page).toHaveURL(/lesson-01-model$/);
});

test("failed save and submission retries reuse their operation IDs", async ({
  page,
}) => {
  const routes = await installCourseRoutes(page, {
    enrolled: true,
    failCompleteOnce: true,
    failExerciseOnce: true,
  });
  await page.goto(
    "/courses/geo-foundations/lesson/lesson-01/step/lesson-01-story",
  );

  await actionButton(page).click();
  await expect(actionButton(page)).toHaveAccessibleName("记录失败，点这里重试");
  await actionButton(page).click();
  await expect(page).toHaveURL(/lesson-01-model$/);
  expect(routes.completeRequests).toHaveLength(2);
  expect(routes.completeRequests[0]?.operationId).toBe(
    routes.completeRequests[1]?.operationId,
  );

  await (await revealAction(page, /方法我理解了/)).click();
  await expect(page).toHaveURL(/lesson-01-practice$/);
  await page.getByText("确认场景、证据和验收，再安排交付").click();
  await actionButton(page).click();
  await expect(actionButton(page)).toHaveAccessibleName("提交失败，点这里重试");
  await actionButton(page).click();
  await expect(page.getByText("答对了")).toBeVisible();
  expect(routes.exerciseRequests).toHaveLength(2);
  expect(routes.exerciseRequests[0]?.operationId).toBe(
    routes.exerciseRequests[1]?.operationId,
  );
});

test("all twenty lessons unlock in sequence and lead to feedback", async ({
  page,
}) => {
  test.slow();
  await installCourseRoutes(page);
  await page.goto("/courses/geo-foundations");
  await page.getByRole("button", { name: /开始学习/ }).click();

  for (let lesson = 1; lesson <= 20; lesson += 1) {
    const key = String(lesson).padStart(2, "0");
    await expect(page).toHaveURL(new RegExp(`lesson-${key}-story$`));
    await (await revealAction(page, /现场我看懂了/)).click();
    await expect(page).toHaveURL(new RegExp(`lesson-${key}-model$`));
    await expect(page.locator(".course-model")).toHaveAttribute(
      "data-model-layout",
      modelLayouts[lesson - 1]!,
    );
    await expect(page.locator(".course-model-stage li")).toHaveCount(
      modelNodeCounts[lesson - 1]!,
    );
    await expect(
      page.getByText(modelTitles[lesson - 1]!, { exact: true }),
    ).toBeVisible();
    const modelBox = await page.locator(".course-model").boundingBox();
    expect(modelBox?.height).toBeLessThanOrEqual(450);
    await (await revealAction(page, /方法我理解了/)).click();
    await expect(page).toHaveURL(new RegExp(`lesson-${key}-practice$`));
    await page.getByText("确认场景、证据和验收，再安排交付").click();
    await actionButton(page).click();
    await expect(page.getByText("答对了")).toBeVisible();
    await (
      await revealAction(
        page,
        lesson === 20
          ? /这门课我学完了，查看学习总结/
          : /解析我读完了，进入下一节/,
      )
    ).click();
  }

  await expect(page).toHaveURL(/completion$/);
  await expect(
    page.getByRole("heading", { name: "20 节 GEO 实战学习已记录" }),
  ).toBeVisible();
  await page
    .getByLabel("还想告诉我们什么？")
    .fill("业务故事和练习反馈很有帮助。");
  await page.getByRole("button", { name: "提交评价" }).click();
  await expect(
    page.getByRole("heading", { name: "评价已经收到" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /查看凭证规则/ }).click();
  await expect(page.getByText("当前不签发正式证书")).toBeVisible();
});
