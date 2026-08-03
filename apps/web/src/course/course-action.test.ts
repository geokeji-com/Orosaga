import { describe, expect, it } from "vitest";
import {
  isCourseContentAtEnd,
  nextCourseScrollTop,
  resolveCourseAction,
} from "./course-action";

const baseInput = {
  kind: "STORY" as const,
  lessonNumber: 1,
  actionLabel: "现场我看懂了，看看四步链路",
  contentAtEnd: true,
  completed: false,
  selectedOptionId: null,
  result: null,
  correcting: false,
  completeStatus: "idle" as const,
  submitStatus: "idle" as const,
};

describe("course action resolver", () => {
  it("protects unread content before exposing the business action", () => {
    expect(
      resolveCourseAction({ ...baseInput, contentAtEnd: false }),
    ).toMatchObject({
      type: "SCROLL",
      label: "继续往下看",
      disabled: false,
      supportsEnter: true,
    });
  });

  it("gives network state priority and preserves retry intent", () => {
    expect(
      resolveCourseAction({ ...baseInput, completeStatus: "pending" }),
    ).toMatchObject({
      type: "IDLE",
      label: "正在记录这一页…",
      disabled: true,
      busy: true,
      supportsEnter: false,
    });
    expect(
      resolveCourseAction({ ...baseInput, completeStatus: "error" }),
    ).toMatchObject({
      type: "RETRY_COMPLETE",
      label: "记录失败，点这里重试",
      disabled: false,
    });
  });

  it("uses one practice action for selection, correction and feedback", () => {
    const practice = {
      ...baseInput,
      kind: "PRACTICE" as const,
      actionLabel: "提交我的判断",
    };

    expect(resolveCourseAction(practice)).toMatchObject({
      type: "IDLE",
      label: "先选一个答案",
      disabled: true,
      hint: "Tab 进入选项，方向键切换",
    });
    expect(
      resolveCourseAction({ ...practice, selectedOptionId: "a" }),
    ).toMatchObject({ type: "SUBMIT", label: "提交我的判断" });
    expect(
      resolveCourseAction({
        ...practice,
        selectedOptionId: "c",
        correcting: true,
      }),
    ).toMatchObject({ type: "SUBMIT", label: "提交我的新判断" });
    expect(
      resolveCourseAction({ ...practice, result: { correct: false } }),
    ).toMatchObject({ type: "RESET", label: "我再想一次，重新选择" });
    expect(
      resolveCourseAction({ ...practice, result: { correct: true } }),
    ).toMatchObject({
      type: "NAVIGATE",
      label: "解析我读完了，进入下一节",
    });
  });

  it("handles restored completion and the final lesson", () => {
    expect(
      resolveCourseAction({ ...baseInput, completed: true }),
    ).toMatchObject({
      type: "NAVIGATE",
      label: "这一页已完成，继续学习",
    });

    const finalPractice = {
      ...baseInput,
      kind: "PRACTICE" as const,
      lessonNumber: 20,
      result: { correct: true },
    };
    expect(resolveCourseAction(finalPractice)).toMatchObject({
      type: "NAVIGATE",
      label: "这门课我学完了，查看学习总结",
    });
    expect(
      resolveCourseAction({ ...finalPractice, result: null, completed: true }),
    ).toMatchObject({
      type: "NAVIGATE",
      label: "查看我的学习总结",
    });
  });
});

describe("course content viewport helpers", () => {
  it("treats the last eight pixels as the content end", () => {
    expect(
      isCourseContentAtEnd({
        scrollHeight: 1_000,
        scrollTop: 392,
        clientHeight: 600,
      }),
    ).toBe(true);
    expect(
      isCourseContentAtEnd({
        scrollHeight: 1_000,
        scrollTop: 391,
        clientHeight: 600,
      }),
    ).toBe(false);
  });

  it("advances one readable viewport with overlap and clamps to the end", () => {
    expect(
      nextCourseScrollTop({
        scrollHeight: 2_000,
        scrollTop: 100,
        clientHeight: 600,
      }),
    ).toBe(652);
    expect(
      nextCourseScrollTop({
        scrollHeight: 1_000,
        scrollTop: 350,
        clientHeight: 600,
      }),
    ).toBe(400);
    expect(
      nextCourseScrollTop({
        scrollHeight: 120,
        scrollTop: 0,
        clientHeight: 120,
      }),
    ).toBe(0);
  });
});
