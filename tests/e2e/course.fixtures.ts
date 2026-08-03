import type { Page, Route } from "@playwright/test";
import {
  courseChapters,
  courseLessons,
  courseStepFor,
} from "../../apps/api/src/course/course-catalog";

const enrollmentId = "70000000-0000-4000-8000-000000000001";
const courseVersion = "pilot-1.0.0";
const lessonTitles = courseLessons.map((lesson) => lesson.title);
const chapters = courseChapters.map((chapter) => chapter.title);

function stepKeys() {
  return Array.from({ length: 20 }, (_, index) => {
    const lessonKey = `lesson-${String(index + 1).padStart(2, "0")}`;
    return [
      `${lessonKey}-story`,
      `${lessonKey}-model`,
      `${lessonKey}-practice`,
    ];
  }).flat();
}

const allStepKeys = stepKeys();

const courseModels = courseLessons.map((lesson) => {
  const model = courseStepFor(lesson, `${lesson.key}-model`)?.model;
  if (!model) throw new Error(`Missing production model for ${lesson.key}`);
  return model;
});

export const modelLayouts = courseModels.map((model) => model.layout);
export const modelNodeCounts = courseModels.map((model) => model.nodes.length);
export const modelTitles = courseModels.map((model) => model.title);

function stepHref(stepKey: string) {
  const lessonKey = stepKey.slice(0, "lesson-00".length);
  return `/courses/geo-foundations/lesson/${lessonKey}/step/${stepKey}`;
}

function adjacentHref(stepKey: string) {
  const index = allStepKeys.indexOf(stepKey);
  return {
    previousHref: index > 0 ? stepHref(allStepKeys[index - 1]!) : "/courses",
    nextHref:
      index === allStepKeys.length - 1
        ? "/courses/geo-foundations/completion"
        : stepHref(allStepKeys[index + 1]!),
  };
}

export async function installCourseRoutes(
  page: Page,
  options: {
    enrolled?: boolean;
    completedSteps?: string[];
    failCompleteOnce?: boolean;
    failExerciseOnce?: boolean;
    accessDenied?: boolean;
  } = {},
) {
  let enrolled = options.enrolled ?? false;
  const completed = new Set(options.completedSteps ?? []);
  const completeRequests: Array<{ operationId: string }> = [];
  const exerciseRequests: Array<{
    operationId: string;
    selectedOptionId: "a" | "b" | "c" | "d";
  }> = [];
  let completeFailuresRemaining = options.failCompleteOnce ? 1 : 0;
  let exerciseFailuresRemaining = options.failExerciseOnce ? 1 : 0;
  let feedbackSubmitted = false;

  function enrollment() {
    const completedSteps = completed.size;
    const completedLessons = Array.from({ length: 20 }, (_, index) => {
      const key = `lesson-${String(index + 1).padStart(2, "0")}`;
      return ["story", "model", "practice"].every((step) =>
        completed.has(`${key}-${step}`),
      );
    }).filter(Boolean).length;
    const currentStepKey =
      allStepKeys.find((key) => !completed.has(key)) ?? null;
    return {
      id: enrollmentId,
      courseSlug: "geo-foundations" as const,
      courseVersion,
      status:
        completedSteps === 60
          ? ("COMPLETED" as const)
          : ("IN_PROGRESS" as const),
      completedSteps,
      totalSteps: 60 as const,
      completedLessons,
      progressPercent: Math.round((completedSteps / 60) * 100),
      currentLessonKey: currentStepKey?.slice(0, "lesson-00".length) ?? null,
      currentStepKey,
      continueHref: currentStepKey ? stepHref(currentStepKey) : null,
      startedAt: "2026-08-03T01:00:00.000Z",
      completedAt: completedSteps === 60 ? "2026-08-03T03:00:00.000Z" : null,
    };
  }

  function outline() {
    return chapters.map((title, chapterIndex) => ({
      key: `chapter-${chapterIndex + 1}`,
      number: chapterIndex + 1,
      title,
      lessons: lessonTitles
        .map((title, index) => {
          const number = index + 1;
          const key = `lesson-${String(number).padStart(2, "0")}`;
          const lessonSteps = ["story", "model", "practice"].map(
            (step) => `${key}-${step}`,
          );
          const completedCount = lessonSteps.filter((step) =>
            completed.has(step),
          ).length;
          const unlocked =
            number === 1 ||
            completed.has(
              `lesson-${String(number - 1).padStart(2, "0")}-practice`,
            );
          return {
            key,
            number,
            chapterNumber: Math.floor(index / 4) + 1,
            title,
            goal: `掌握第 ${number} 节的核心判断。`,
            estimatedMinutes: 10,
            artifact: `第 ${number} 节行动卡`,
            steps: lessonSteps.map((stepKey, stepIndex) => ({
              key: stepKey,
              kind: (["STORY", "MODEL", "PRACTICE"] as const)[stepIndex]!,
              label: (["场景", "方法", "练习"] as const)[stepIndex]!,
              title: [
                "进入业务现场",
                `第 ${number} 节底层方法`,
                "完成本节判断",
              ][stepIndex]!,
              href: stepHref(stepKey),
              state: completed.has(stepKey)
                ? ("COMPLETED" as const)
                : allStepKeys
                      .slice(0, allStepKeys.indexOf(stepKey))
                      .every((previous) => completed.has(previous))
                  ? ("AVAILABLE" as const)
                  : ("LOCKED" as const),
            })),
            state:
              completedCount === 3
                ? ("COMPLETED" as const)
                : !unlocked
                  ? ("LOCKED" as const)
                  : completedCount > 0
                    ? ("IN_PROGRESS" as const)
                    : ("AVAILABLE" as const),
          };
        })
        .filter((lesson) => lesson.chapterNumber === chapterIndex + 1),
    }));
  }

  const summary = () => ({
    slug: "geo-foundations" as const,
    shortTitle: "GEO 实战训练营" as const,
    title: "从 AI 回答到 GEO 交付" as const,
    description:
      "在一条虚构客户项目线上，练习移山科技的 GEO 研究、策略、交付与运营方法。",
    packProfile: "PILOT" as const,
    version: courseVersion,
    lessonCount: 20 as const,
    estimatedMinutes: 200,
    certificateAvailable: false,
    enrollment: enrolled ? enrollment() : null,
  });

  const detail = () => ({
    ...summary(),
    greeting: enrolled
      ? {
          title: "欢迎回来，示例学员。",
          detail: `你已经完成 ${enrollment().completedLessons} / 20 节。`,
          actionLabel: "继续学习",
        }
      : {
          title: "欢迎来到学习中心，示例学员。",
          detail: "从澄屿工业热能的第一条客户消息开始。",
          actionLabel: "开始学习",
        },
    chapters: outline(),
  });

  const fulfill = (route: Route, body: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/me")
      return fulfill(route, {
        id: "60000000-0000-4000-8000-000000000001",
        displayName: "示例学员",
        role: "EMPLOYEE",
      });
    if (
      options.accessDenied &&
      (path.startsWith("/api/v1/courses") ||
        path.startsWith("/api/v1/course-enrollments"))
    )
      return fulfill(
        route,
        {
          code: "COURSE_PILOT_ACCESS_REQUIRED",
          message: "当前课程仍在授权试学阶段",
        },
        403,
      );
    if (path === "/api/v1/courses") return fulfill(route, [summary()]);
    if (
      path === "/api/v1/courses/geo-foundations" &&
      request.method() === "GET"
    )
      return fulfill(route, detail());
    if (path.endsWith("/courses/geo-foundations/enrollments")) {
      enrolled = true;
      return fulfill(route, enrollment());
    }
    if (/\/course-enrollments\/[^/]+\/lessons\/lesson-\d{2}$/.test(path)) {
      const lessonKey = path.split("/").at(-1)!;
      const stepKey = new URL(request.url()).searchParams.get("step")!;
      const lessonNumber = Number(lessonKey.slice(-2));
      const kind = stepKey.endsWith("-story")
        ? "STORY"
        : stepKey.endsWith("-model")
          ? "MODEL"
          : "PRACTICE";
      const exercise =
        kind === "PRACTICE"
          ? {
              key: stepKey,
              stem: "面对这项客户需求，哪一种行动最符合本节方法？",
              options: [
                { id: "a", text: "直接沿用上一次项目的结论" },
                { id: "b", text: "先写一篇长文再补证据" },
                { id: "c", text: "确认场景、证据和验收，再安排交付" },
                { id: "d", text: "只看单一平台的短期排名" },
              ],
            }
          : null;
      return fulfill(route, {
        course: (({ enrollment: _enrollment, ...course }) => course)(summary()),
        enrollment: enrollment(),
        lesson: outline()
          .flatMap((chapter) => chapter.lessons)
          .find((lesson) => lesson.key === lessonKey),
        chapters: outline(),
        step: {
          key: stepKey,
          lessonKey,
          position: kind === "STORY" ? 1 : kind === "MODEL" ? 2 : 3,
          kind,
          eyebrow:
            kind === "STORY"
              ? "进入业务现场"
              : kind === "MODEL"
                ? "看懂方法"
                : "做出判断",
          title:
            kind === "STORY"
              ? `澄屿项目，第 ${lessonNumber} 个现场`
              : kind === "MODEL"
                ? `第 ${lessonNumber} 节方法模型`
                : `第 ${lessonNumber} 节练习`,
          intro: "沿着同一条客户项目线理解背景、误区、移山方法和底层原理。",
          actionLabel:
            kind === "STORY"
              ? "现场我看懂了，看看下一种方法"
              : kind === "MODEL"
                ? "方法我理解了，来做判断"
                : "提交我的判断",
          sections:
            kind === "PRACTICE"
              ? []
              : [
                  {
                    label: "背景故事",
                    title: "客户把一个模糊目标交给了项目组",
                    body: "项目组需要先确认真实决策场景，再安排研究与交付。",
                    tone: "neutral",
                  },
                  {
                    label: "常见误区",
                    title: "急着生产内容",
                    body: "缺少场景和验收时，内容数量无法转成业务价值。",
                    tone: "danger",
                  },
                  {
                    label: "移山方法",
                    title: "先对齐场景、证据与验收",
                    body: "把目标拆成可检查的任务，让每个交付物都有明确用途。",
                    tone: "success",
                  },
                ],
          model: kind === "MODEL" ? courseModels[lessonNumber - 1]! : null,
          exercise,
          completed: completed.has(stepKey),
        },
        ...adjacentHref(stepKey),
      });
    }
    if (/\/course-enrollments\/[^/]+\/steps\/.+$/.test(path)) {
      const completedStep = path.split("/").at(-1)!;
      completeRequests.push(request.postDataJSON() as { operationId: string });
      if (completeFailuresRemaining > 0) {
        completeFailuresRemaining -= 1;
        return fulfill(
          route,
          { code: "COURSE_STEP_SAVE_FAILED", message: "测试保存失败" },
          503,
        );
      }
      completed.add(completedStep);
      return fulfill(route, {
        enrollment: enrollment(),
        nextHref: adjacentHref(completedStep).nextHref,
      });
    }
    if (/\/course-enrollments\/[^/]+\/exercises\/.+\/attempts$/.test(path)) {
      const exerciseKey = path.split("/").at(-2)!;
      const requestBody = request.postDataJSON() as {
        selectedOptionId: "a" | "b" | "c" | "d";
        operationId: string;
      };
      exerciseRequests.push(requestBody);
      if (exerciseFailuresRemaining > 0) {
        exerciseFailuresRemaining -= 1;
        return fulfill(
          route,
          { code: "COURSE_EXERCISE_FAILED", message: "测试提交失败" },
          503,
        );
      }
      const selectedOptionId = requestBody.selectedOptionId;
      const correct = selectedOptionId === "c";
      if (correct) completed.add(exerciseKey);
      return fulfill(route, {
        correct,
        selectedOptionId,
        hint: correct
          ? "判断正确，可以继续下一步。"
          : "先确认场景、证据和验收。",
        analysis: "这道题检验能否把业务目标转成可执行、可检查的交付任务。",
        optionAnalyses: [
          { optionId: "a", text: "历史结论需要经过当前证据复核。" },
          { optionId: "b", text: "生产动作应当建立在场景和证据之后。" },
          { optionId: "c", text: "场景、证据和验收共同构成可执行任务。" },
          { optionId: "d", text: "单一短期排名无法代表完整业务价值。" },
        ],
        enrollment: enrollment(),
        nextHref: correct ? adjacentHref(exerciseKey).nextHref : null,
      });
    }
    if (path.endsWith("/completion") || path.endsWith("/certificate"))
      return fulfill(route, {
        completed: completed.size === 60,
        packProfile: "PILOT",
        completedLessons: enrollment().completedLessons,
        lessonCount: 20,
        feedbackSubmitted,
        certificate: {
          available: false,
          reason:
            "当前为试学版，完成记录会保留。正式课程发布后将按新版本规则确认结业证书。",
        },
      });
    if (path.endsWith("/feedback")) {
      feedbackSubmitted = true;
      return fulfill(route, {
        completed: true,
        packProfile: "PILOT",
        completedLessons: 20,
        lessonCount: 20,
        feedbackSubmitted: true,
        certificate: { available: false, reason: "当前为试学版。" },
      });
    }
    return fulfill(
      route,
      { code: "NOT_FOUND", message: "测试路由未定义" },
      404,
    );
  });

  return {
    completed,
    getEnrollment: enrollment,
    completeRequests,
    exerciseRequests,
  };
}
