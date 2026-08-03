import type { CourseExerciseResult, CourseStep } from "@orosaga/contracts";

export type CourseScrollMetrics = {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
};

const COURSE_CONTENT_END_THRESHOLD = 8;
const COURSE_SCROLL_OVERLAP = 48;

export function isCourseContentAtEnd(
  metrics: CourseScrollMetrics,
  threshold = COURSE_CONTENT_END_THRESHOLD,
) {
  return (
    metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight <= threshold
  );
}

export function nextCourseScrollTop(
  metrics: CourseScrollMetrics,
  overlap = COURSE_SCROLL_OVERLAP,
) {
  const maxScrollTop = Math.max(0, metrics.scrollHeight - metrics.clientHeight);
  const advance = Math.max(overlap, metrics.clientHeight - overlap);
  return Math.min(maxScrollTop, metrics.scrollTop + advance);
}

export type CourseActionType =
  | "SCROLL"
  | "COMPLETE"
  | "SUBMIT"
  | "RESET"
  | "NAVIGATE"
  | "RETRY_COMPLETE"
  | "RETRY_SUBMIT"
  | "IDLE";

type RequestStatus = "idle" | "pending" | "error";

export type CourseAction = {
  type: CourseActionType;
  label: string;
  hint?: string;
  disabled: boolean;
  busy: boolean;
  supportsEnter: boolean;
};

export type CourseActionInput = {
  kind: CourseStep["kind"];
  lessonNumber: number;
  actionLabel: string;
  contentAtEnd: boolean;
  completed: boolean;
  selectedOptionId: string | null;
  result: Pick<CourseExerciseResult, "correct"> | null;
  correcting: boolean;
  completeStatus: RequestStatus;
  submitStatus: RequestStatus;
};

export function resolveCourseAction(input: CourseActionInput): CourseAction {
  if (input.completeStatus === "pending" || input.submitStatus === "pending") {
    return {
      type: "IDLE",
      label:
        input.submitStatus === "pending"
          ? "正在检查我的判断…"
          : "正在记录这一页…",
      disabled: true,
      busy: true,
      supportsEnter: false,
    };
  }

  if (input.completeStatus === "error") {
    return {
      type: "RETRY_COMPLETE",
      label: "记录失败，点这里重试",
      disabled: false,
      busy: false,
      supportsEnter: true,
    };
  }

  if (input.submitStatus === "error") {
    return {
      type: "RETRY_SUBMIT",
      label: "提交失败，点这里重试",
      disabled: false,
      busy: false,
      supportsEnter: true,
    };
  }

  if (!input.contentAtEnd) {
    return {
      type: "SCROLL",
      label: input.result ? "继续看完整解析" : "继续往下看",
      disabled: false,
      busy: false,
      supportsEnter: true,
    };
  }

  if (input.kind === "PRACTICE") {
    if (input.result?.correct) {
      return {
        type: "NAVIGATE",
        label:
          input.lessonNumber === 20
            ? "这门课我学完了，查看学习总结"
            : "解析我读完了，进入下一节",
        disabled: false,
        busy: false,
        supportsEnter: true,
      };
    }

    if (input.result) {
      return {
        type: "RESET",
        label: "我再想一次，重新选择",
        disabled: false,
        busy: false,
        supportsEnter: true,
      };
    }

    if (input.completed) {
      return {
        type: "NAVIGATE",
        label:
          input.lessonNumber === 20
            ? "查看我的学习总结"
            : "本节已完成，继续下一节",
        disabled: false,
        busy: false,
        supportsEnter: true,
      };
    }

    if (!input.selectedOptionId) {
      return {
        type: "IDLE",
        label: "先选一个答案",
        hint: "Tab 进入选项，方向键切换",
        disabled: true,
        busy: false,
        supportsEnter: false,
      };
    }

    return {
      type: "SUBMIT",
      label: input.correcting ? "提交我的新判断" : input.actionLabel,
      disabled: false,
      busy: false,
      supportsEnter: true,
    };
  }

  if (input.completed) {
    return {
      type: "NAVIGATE",
      label: "这一页已完成，继续学习",
      disabled: false,
      busy: false,
      supportsEnter: true,
    };
  }

  return {
    type: "COMPLETE",
    label: input.actionLabel,
    disabled: false,
    busy: false,
    supportsEnter: true,
  };
}
