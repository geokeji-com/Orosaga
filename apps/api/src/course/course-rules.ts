import {
  courseChapters,
  courseDefinition,
  courseLessons,
  courseStepKeys,
} from "./course-catalog.js";

export function courseHref(stepKey: string) {
  const lessonKey = stepKey.slice(0, "lesson-00".length);
  return `/courses/${courseDefinition.slug}/lesson/${lessonKey}/step/${stepKey}`;
}

export function courseProgress(completedKeys: Iterable<string>) {
  const completed = new Set(completedKeys);
  const currentIndex = courseStepKeys.findIndex((key) => !completed.has(key));
  const completedSteps = courseStepKeys.filter((key) =>
    completed.has(key),
  ).length;
  const completedLessons = courseLessons.filter((item) =>
    [`${item.key}-story`, `${item.key}-model`, `${item.key}-practice`].every(
      (key) => completed.has(key),
    ),
  ).length;
  const currentStepKey =
    currentIndex === -1 ? null : (courseStepKeys[currentIndex] ?? null);
  const currentLessonKey = currentStepKey?.slice(0, "lesson-00".length) ?? null;
  return {
    completedSteps,
    completedLessons,
    progressPercent: Math.round((completedSteps / courseStepKeys.length) * 100),
    currentStepKey,
    currentLessonKey,
    continueHref: currentStepKey ? courseHref(currentStepKey) : null,
    complete: completedSteps === courseStepKeys.length,
  };
}

export function courseOutline(completedKeys: Iterable<string>) {
  const completed = new Set(completedKeys);
  return courseChapters.map((chapter) => ({
    ...chapter,
    lessons: courseLessons
      .filter((item) => item.chapterNumber === chapter.number)
      .map((item) => {
        const steps = [
          {
            key: `${item.key}-story`,
            kind: "STORY" as const,
            label: "场景",
            title: "进入业务现场",
          },
          {
            key: `${item.key}-model`,
            kind: "MODEL" as const,
            label: "方法",
            title: item.modelTitle,
          },
          {
            key: `${item.key}-practice`,
            kind: "PRACTICE" as const,
            label: "练习",
            title: "完成本节判断",
          },
        ];
        const keys = steps.map((step) => step.key);
        const completedCount = keys.filter((key) => completed.has(key)).length;
        const previousPractice =
          item.number === 1
            ? null
            : `${courseLessons[item.number - 2]!.key}-practice`;
        const unlocked = !previousPractice || completed.has(previousPractice);
        return {
          key: item.key,
          number: item.number,
          chapterNumber: item.chapterNumber,
          title: item.title,
          goal: item.goal,
          estimatedMinutes: item.estimatedMinutes,
          artifact: item.artifact,
          steps: steps.map((step) => ({
            ...step,
            href: courseHref(step.key),
            state: completed.has(step.key)
              ? ("COMPLETED" as const)
              : canOpenCourseStep(step.key, completed)
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
      }),
  }));
}

export function canOpenCourseStep(
  stepKey: string,
  completedKeys: Iterable<string>,
) {
  const index = courseStepKeys.indexOf(stepKey);
  if (index < 0) return false;
  const completed = new Set(completedKeys);
  return courseStepKeys.slice(0, index).every((key) => completed.has(key));
}

export function adjacentCourseHrefs(stepKey: string) {
  const index = courseStepKeys.indexOf(stepKey);
  if (index < 0) return { previousHref: null, nextHref: null };
  return {
    previousHref:
      index > 0 ? courseHref(courseStepKeys[index - 1]!) : "/courses",
    nextHref:
      index === courseStepKeys.length - 1
        ? `/courses/${courseDefinition.slug}/completion`
        : courseHref(courseStepKeys[index + 1]!),
  };
}
