import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import type { CourseExerciseResult } from "@orosaga/contracts";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleAlert,
  Lightbulb,
  LockKeyhole,
  Menu,
  XCircle,
} from "lucide-react";
import { AccountMenu } from "../components/AccountMenu";
import { Brand } from "../components/Brand";
import { courseApi } from "../lib/course-api";
import { CourseActionDock } from "./CourseActionDock";
import { CourseVisualModel } from "./CourseVisualModel";
import {
  isCourseContentAtEnd,
  nextCourseScrollTop,
  resolveCourseAction,
} from "./course-action";
import { CoursePageState } from "./CourseChrome";

const stepLabels = {
  STORY: "场景",
  MODEL: "方法",
  PRACTICE: "练习",
} as const;

export default function CourseWorkspacePage() {
  const { lessonKey = "", stepKey = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lessonMainRef = useRef<HTMLElement>(null);
  const lessonContentRef = useRef<HTMLDivElement>(null);
  const lessonTitleRef = useRef<HTMLHeadingElement>(null);
  const outlineRef = useRef<HTMLDivElement>(null);
  const outlineTriggerRef = useRef<HTMLButtonElement>(null);
  const outlineCloseRef = useRef<HTMLButtonElement>(null);
  const exerciseFieldsetRef = useRef<HTMLFieldSetElement>(null);
  const exerciseFeedbackRef = useRef<HTMLDivElement>(null);
  const exerciseFeedbackTitleRef = useRef<HTMLDivElement>(null);
  const completeOperationRef = useRef<{ stepKey: string; id: string } | null>(
    null,
  );
  const submitOperationRef = useRef<{
    stepKey: string;
    optionId: "a" | "b" | "c" | "d";
    id: string;
  } | null>(null);
  const actionLockRef = useRef(false);
  const scrollTargetRef = useRef<number | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [isOutlineDrawer, setIsOutlineDrawer] = useState(false);
  const [contentEndState, setContentEndState] = useState({
    stepKey: "",
    atEnd: true,
  });
  const [exerciseState, setExerciseState] = useState<{
    stepKey: string;
    selectedOption: "a" | "b" | "c" | "d" | null;
    result: CourseExerciseResult | null;
    correcting: boolean;
  }>({
    stepKey: "",
    selectedOption: null,
    result: null,
    correcting: false,
  });
  const selectedOption =
    exerciseState.stepKey === stepKey ? exerciseState.selectedOption : null;
  const exerciseResult =
    exerciseState.stepKey === stepKey ? exerciseState.result : null;
  const correcting =
    exerciseState.stepKey === stepKey ? exerciseState.correcting : false;

  const course = useQuery({
    queryKey: ["course", "geo-foundations"],
    queryFn: courseApi.detail,
  });
  const enrollmentId = course.data?.enrollment?.id;
  const lesson = useQuery({
    queryKey: ["course-lesson", enrollmentId, lessonKey, stepKey],
    queryFn: () => courseApi.lesson(enrollmentId!, lessonKey, stepKey),
    enabled: Boolean(enrollmentId && lessonKey && stepKey),
    retry: false,
  });

  const measureContentEnd = useCallback(() => {
    const content = lessonContentRef.current;
    if (!content) return;
    const atEnd = isCourseContentAtEnd(content);
    setContentEndState((current) =>
      current.stepKey === stepKey && current.atEnd === atEnd
        ? current
        : { stepKey, atEnd },
    );
  }, [stepKey]);

  const closeOutline = useCallback((returnFocus = true) => {
    setOutlineOpen(false);
    if (!returnFocus) return;
    requestAnimationFrame(() => outlineTriggerRef.current?.focus());
  }, []);

  useLayoutEffect(() => {
    const query = window.matchMedia("(max-width: 1060px)");
    const synchronize = () => {
      setIsOutlineDrawer(query.matches);
      if (!query.matches) setOutlineOpen(false);
    };
    synchronize();
    query.addEventListener("change", synchronize);
    return () => query.removeEventListener("change", synchronize);
  }, []);

  useLayoutEffect(() => {
    if (!isOutlineDrawer || !outlineOpen) return;
    outlineCloseRef.current?.focus();
  }, [isOutlineDrawer, outlineOpen]);

  useLayoutEffect(() => {
    const content = lessonContentRef.current;
    content?.scrollTo({ top: 0, behavior: "instant" });
    scrollTargetRef.current = null;
    actionLockRef.current = false;
    if (completeOperationRef.current?.stepKey !== stepKey)
      completeOperationRef.current = null;
    if (submitOperationRef.current?.stepKey !== stepKey)
      submitOperationRef.current = null;
  }, [lessonKey, stepKey]);

  useLayoutEffect(() => {
    if (!lesson.isSuccess) return;
    lessonTitleRef.current?.focus({ preventScroll: true });
    measureContentEnd();
  }, [lesson.isSuccess, measureContentEnd, stepKey]);

  useEffect(() => {
    if (!lesson.isSuccess) return;
    const content = lessonContentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(measureContentEnd);
    observer.observe(content);
    Array.from(content.children).forEach((child) => observer.observe(child));
    measureContentEnd();
    return () => observer.disconnect();
  }, [exerciseResult, lesson.isSuccess, measureContentEnd, stepKey]);

  useEffect(() => {
    const content = lessonContentRef.current;
    if (!content) return;
    const unlockScroll = () => {
      scrollTargetRef.current = null;
      measureContentEnd();
    };
    content.addEventListener("scrollend", unlockScroll);
    return () => content.removeEventListener("scrollend", unlockScroll);
  }, [lesson.isSuccess, measureContentEnd, stepKey]);

  useLayoutEffect(() => {
    if (!exerciseResult) return;
    exerciseFeedbackRef.current?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
    exerciseFeedbackTitleRef.current?.focus({ preventScroll: true });
    measureContentEnd();
  }, [exerciseResult, measureContentEnd]);

  useEffect(() => {
    if (!course.isSuccess || course.data.enrollment) return;
    navigate("/courses/geo-foundations", { replace: true });
  }, [course.data, course.isSuccess, navigate]);

  const complete = useMutation({
    mutationFn: (operationId: string) =>
      courseApi.completeStep(enrollmentId!, stepKey, operationId),
    onSuccess: async (result) => {
      completeOperationRef.current = null;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["course"] }),
        queryClient.invalidateQueries({ queryKey: ["courses"] }),
      ]);
      navigate(result.nextHref ?? "/courses/geo-foundations/completion");
    },
    onSettled: () => {
      actionLockRef.current = false;
    },
  });
  const submitExercise = useMutation({
    mutationFn: ({
      optionId,
      operationId,
    }: {
      optionId: "a" | "b" | "c" | "d";
      operationId: string;
    }) =>
      courseApi.submitExercise(enrollmentId!, stepKey, optionId, operationId),
    onSuccess: async (result) => {
      submitOperationRef.current = null;
      setExerciseState((current) => ({
        stepKey,
        selectedOption:
          current.stepKey === stepKey
            ? current.selectedOption
            : result.selectedOptionId,
        result,
        correcting: current.stepKey === stepKey && current.correcting,
      }));
      if (result.correct) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["course"] }),
          queryClient.invalidateQueries({ queryKey: ["courses"] }),
          queryClient.invalidateQueries({ queryKey: ["course-lesson"] }),
        ]);
      }
    },
    onSettled: () => {
      actionLockRef.current = false;
    },
  });

  const allLessons = useMemo(
    () => lesson.data?.chapters.flatMap((chapter) => chapter.lessons) ?? [],
    [lesson.data?.chapters],
  );

  if (course.isPending || lesson.isPending || !course.data?.enrollment) {
    return (
      <div className="course-site">
        <CoursePageState
          title="正在打开学习现场"
          detail="课程大纲、内容和进度正在同步。"
        />
      </div>
    );
  }

  if (course.isError || lesson.isError || !lesson.data) {
    return (
      <div className="course-site">
        <CoursePageState
          title="这一步暂时无法打开"
          detail="它可能还没有解锁，或网络连接刚刚中断。请回到你的当前进度继续。"
          action={
            <a
              className="course-button course-button-primary"
              href={course.data?.enrollment?.continueHref ?? "/courses"}
            >
              回到当前进度
            </a>
          }
        />
      </div>
    );
  }

  const payload = lesson.data;
  const currentLessonIndex = allLessons.findIndex(
    (item) => item.key === payload.lesson.key,
  );
  const step = payload.step;
  const isPractice = step.kind === "PRACTICE";
  const optionAnalysis = new Map(
    exerciseResult?.optionAnalyses.map((item) => [item.optionId, item.text]),
  );
  const contentAtEnd =
    contentEndState.stepKey === stepKey && contentEndState.atEnd;
  const mutationPending = complete.isPending || submitExercise.isPending;
  const previousLabel =
    currentLessonIndex === 0 && step.position === 1
      ? "返回学习中心"
      : "回看上一步";
  const action = resolveCourseAction({
    kind: step.kind,
    lessonNumber: payload.lesson.number,
    actionLabel: step.actionLabel,
    contentAtEnd,
    completed: step.completed,
    selectedOptionId: selectedOption,
    result: exerciseResult,
    correcting,
    completeStatus: complete.isPending
      ? "pending"
      : complete.isError
        ? "error"
        : "idle",
    submitStatus: submitExercise.isPending
      ? "pending"
      : submitExercise.isError
        ? "error"
        : "idle",
  });

  function handleContentScroll() {
    const content = lessonContentRef.current;
    if (!content) return;
    measureContentEnd();
    const target = scrollTargetRef.current;
    if (
      target !== null &&
      (content.scrollTop >= target - 2 || isCourseContentAtEnd(content))
    ) {
      scrollTargetRef.current = null;
    }
  }

  function executeCourseAction() {
    if (action.disabled || actionLockRef.current) return false;

    if (action.type === "SCROLL") {
      const content = lessonContentRef.current;
      if (!content || scrollTargetRef.current !== null) return false;
      const target = nextCourseScrollTop(content);
      if (target <= content.scrollTop + 1) {
        measureContentEnd();
        return false;
      }
      scrollTargetRef.current = target;
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      content.scrollTo({
        top: target,
        behavior: reducedMotion ? "auto" : "smooth",
      });
      return true;
    }

    if (action.type === "COMPLETE" || action.type === "RETRY_COMPLETE") {
      actionLockRef.current = true;
      let operation = completeOperationRef.current;
      if (!operation || operation.stepKey !== stepKey) {
        operation = { stepKey, id: crypto.randomUUID() };
        completeOperationRef.current = operation;
      }
      complete.mutate(operation.id);
      return true;
    }

    if (action.type === "SUBMIT" || action.type === "RETRY_SUBMIT") {
      if (!selectedOption) return false;
      actionLockRef.current = true;
      let operation = submitOperationRef.current;
      if (
        !operation ||
        operation.stepKey !== stepKey ||
        operation.optionId !== selectedOption
      ) {
        operation = {
          stepKey,
          optionId: selectedOption,
          id: crypto.randomUUID(),
        };
        submitOperationRef.current = operation;
      }
      submitExercise.mutate({
        optionId: selectedOption,
        operationId: operation.id,
      });
      return true;
    }

    if (action.type === "RESET") {
      submitOperationRef.current = null;
      submitExercise.reset();
      setExerciseState({
        stepKey,
        selectedOption: null,
        result: null,
        correcting: true,
      });
      requestAnimationFrame(() => {
        exerciseFieldsetRef.current?.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
        exerciseFieldsetRef.current
          ?.querySelector<HTMLInputElement>('input[type="radio"]')
          ?.focus({ preventScroll: true });
      });
      return true;
    }

    if (action.type === "NAVIGATE") {
      actionLockRef.current = true;
      navigate(
        exerciseResult?.nextHref ??
          payload.nextHref ??
          "/courses/geo-foundations/completion",
      );
      return true;
    }

    return false;
  }

  function handleLearningKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (
      event.key !== " " ||
      event.defaultPrevented ||
      event.nativeEvent.isComposing ||
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      outlineOpen ||
      document.querySelector('[role="dialog"][aria-modal="true"]')
    )
      return;

    const target = event.target as HTMLElement;
    if (
      target.closest(
        'button, a, textarea, select, input, [contenteditable="true"]',
      )
    )
      return;

    if (executeCourseAction()) event.preventDefault();
  }

  function handleOutlineKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (!isOutlineDrawer || !outlineOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeOutline();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      outlineRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter(
      (element) =>
        !element.hasAttribute("disabled") &&
        element.getClientRects().length > 0,
    );
    if (focusable.length === 0) {
      event.preventDefault();
      outlineRef.current?.focus();
      return;
    }

    const first = focusable[0]!;
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="course-workspace">
      <header className="course-workspace-topbar">
        <div className="course-workspace-brand">
          <Brand />
          <span aria-hidden="true" />
          <a href="/courses">学习中心</a>
        </div>
        <div className="course-workspace-actions">
          <button
            className="course-mobile-outline-trigger"
            type="button"
            ref={outlineTriggerRef}
            aria-expanded={outlineOpen}
            aria-controls="course-outline"
            onClick={() => {
              if (outlineOpen) closeOutline();
              else setOutlineOpen(true);
            }}
          >
            <Menu size={18} aria-hidden="true" />
            课程大纲
          </button>
          <AccountMenu />
        </div>
      </header>

      <div className="course-workspace-body">
        {isOutlineDrawer && outlineOpen && (
          <button
            className="course-outline-backdrop"
            type="button"
            tabIndex={-1}
            aria-label="关闭课程大纲遮罩"
            onClick={() => closeOutline()}
          />
        )}
        <div
          className={outlineOpen ? "course-outline is-open" : "course-outline"}
          id="course-outline"
          ref={outlineRef}
          role={isOutlineDrawer && outlineOpen ? "dialog" : undefined}
          aria-modal={isOutlineDrawer && outlineOpen ? true : undefined}
          aria-hidden={isOutlineDrawer && !outlineOpen ? true : undefined}
          inert={isOutlineDrawer && !outlineOpen}
          aria-label="课程大纲"
          tabIndex={isOutlineDrawer ? -1 : undefined}
          onKeyDown={handleOutlineKeyDown}
        >
          <div className="course-outline-header">
            <div>
              <span>{payload.course.shortTitle}</span>
              <h2>{payload.course.title}</h2>
            </div>
            <button
              type="button"
              ref={outlineCloseRef}
              aria-label="关闭课程大纲"
              onClick={() => closeOutline()}
            >
              <XCircle size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="course-outline-progress">
            <div>
              <span>课程进度</span>
              <strong>{payload.enrollment.progressPercent}%</strong>
            </div>
            <div
              className="course-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={payload.enrollment.progressPercent}
              aria-label="课程进度"
            >
              <i style={{ width: `${payload.enrollment.progressPercent}%` }} />
            </div>
            <small>{payload.enrollment.completedLessons} / 20 节已完成</small>
          </div>

          <nav className="course-outline-nav" aria-label="课程章节">
            {payload.chapters.map((chapter) => {
              const chapterActive = chapter.lessons.some(
                (item) => item.key === payload.lesson.key,
              );
              return (
                <details key={chapter.key} open={chapterActive}>
                  <summary>
                    <span>
                      第 {chapter.number} 章<strong>{chapter.title}</strong>
                    </span>
                    <ChevronDown size={16} aria-hidden="true" />
                  </summary>
                  <ol className="course-outline-lessons">
                    {chapter.lessons.map((item) => {
                      const active = item.key === payload.lesson.key;
                      const locked = item.state === "LOCKED";
                      const completedStepCount = item.steps.filter(
                        (outlineStep) => outlineStep.state === "COMPLETED",
                      ).length;
                      return (
                        <li
                          className="course-outline-lesson-item"
                          key={item.key}
                        >
                          {locked ? (
                            <div className="course-outline-lesson-static is-locked">
                              <LockKeyhole size={15} aria-hidden="true" />
                              <span className="course-outline-lesson-copy">
                                <small>
                                  {String(item.number).padStart(2, "0")}
                                </small>
                                <span>{item.title}</span>
                              </span>
                            </div>
                          ) : (
                            <details
                              className={
                                active
                                  ? "course-outline-lesson-group is-active"
                                  : "course-outline-lesson-group"
                              }
                              open={active}
                            >
                              <summary className="course-outline-lesson-summary">
                                {item.state === "COMPLETED" ? (
                                  <CheckCircle2 size={16} aria-hidden="true" />
                                ) : (
                                  <Circle size={16} aria-hidden="true" />
                                )}
                                <span className="course-outline-lesson-copy">
                                  <small>
                                    {String(item.number).padStart(2, "0")}
                                  </small>
                                  <span>{item.title}</span>
                                </span>
                                <small className="course-outline-lesson-count">
                                  {completedStepCount}/3
                                </small>
                                <ChevronDown size={14} aria-hidden="true" />
                              </summary>
                              <ol className="course-outline-steps">
                                {item.steps.map((outlineStep) => {
                                  const current = outlineStep.key === stepKey;
                                  const stepLocked =
                                    outlineStep.state === "LOCKED";
                                  const className = [
                                    "course-outline-step",
                                    `kind-${outlineStep.kind.toLowerCase()}`,
                                    current ? "is-current" : "",
                                    outlineStep.state === "COMPLETED"
                                      ? "is-completed"
                                      : "",
                                    stepLocked ? "is-locked" : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ");
                                  const stepContent = (
                                    <>
                                      {outlineStep.state === "COMPLETED" ? (
                                        <CheckCircle2
                                          size={15}
                                          aria-hidden="true"
                                        />
                                      ) : (
                                        <Circle size={15} aria-hidden="true" />
                                      )}
                                      <span className="course-outline-step-copy">
                                        <small>{outlineStep.label}</small>
                                        <span>{outlineStep.title}</span>
                                      </span>
                                    </>
                                  );
                                  return (
                                    <li key={outlineStep.key}>
                                      {stepLocked ? (
                                        <span className={className}>
                                          {stepContent}
                                        </span>
                                      ) : (
                                        <a
                                          className={className}
                                          href={outlineStep.href}
                                          aria-current={
                                            current ? "step" : undefined
                                          }
                                        >
                                          {stepContent}
                                        </a>
                                      )}
                                    </li>
                                  );
                                })}
                              </ol>
                            </details>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </details>
              );
            })}
          </nav>
        </div>

        <main
          className="course-lesson-main"
          ref={lessonMainRef}
          onKeyDown={handleLearningKeyDown}
        >
          <div className="course-lesson-wrap">
            <div
              className="course-lesson-content"
              ref={lessonContentRef}
              onScroll={handleContentScroll}
              aria-labelledby="course-lesson-title"
            >
              <div className="course-lesson-meta">
                <span>
                  第 {payload.lesson.number} 节 · {stepLabels[step.kind]}
                </span>
                <div className="course-lesson-meta-actions">
                  {mutationPending ? (
                    <span
                      className="course-lesson-back is-disabled"
                      aria-disabled="true"
                    >
                      <ArrowLeft size={14} aria-hidden="true" />
                      {previousLabel}
                    </span>
                  ) : (
                    <a
                      className="course-lesson-back"
                      href={payload.previousHref ?? "/courses"}
                    >
                      <ArrowLeft size={14} aria-hidden="true" />
                      {previousLabel}
                    </a>
                  )}
                  <span className="course-lesson-duration">
                    约 {payload.lesson.estimatedMinutes} 分钟
                  </span>
                </div>
              </div>
              <p className="course-lesson-eyebrow">{step.eyebrow}</p>
              <h1 id="course-lesson-title" ref={lessonTitleRef} tabIndex={-1}>
                {step.title}
              </h1>
              <p className="course-lesson-intro">{step.intro}</p>

              {!isPractice && (
                <div className="course-learning-sections">
                  {step.sections.map((section) => (
                    <section
                      className={`course-learning-section tone-${section.tone}`}
                      key={`${section.label}-${section.title}`}
                    >
                      <span>{section.label}</span>
                      <h2>{section.title}</h2>
                      <p>{section.body}</p>
                    </section>
                  ))}
                </div>
              )}

              {step.model && <CourseVisualModel model={step.model} />}

              {isPractice && step.exercise && (
                <section
                  className="course-exercise"
                  aria-labelledby="course-exercise-title"
                >
                  <div className="course-exercise-heading">
                    <span>单选题</span>
                    <h2 id="course-exercise-title">{step.exercise.stem}</h2>
                  </div>
                  <fieldset
                    ref={exerciseFieldsetRef}
                    disabled={
                      step.completed ||
                      submitExercise.isPending ||
                      Boolean(exerciseResult)
                    }
                  >
                    <legend className="sr-only">请选择一个答案</legend>
                    {step.exercise.options.map((option) => {
                      const selected = selectedOption === option.id;
                      const resultSelected =
                        exerciseResult?.selectedOptionId === option.id;
                      const optionClass = exerciseResult
                        ? resultSelected
                          ? exerciseResult.correct
                            ? "is-correct"
                            : "is-wrong"
                          : ""
                        : selected
                          ? "is-selected"
                          : "";
                      return (
                        <label
                          className={`course-exercise-option ${optionClass}`}
                          key={option.id}
                        >
                          <input
                            type="radio"
                            name="course-answer"
                            value={option.id}
                            checked={selected}
                            onChange={() => {
                              if (
                                submitOperationRef.current?.optionId !==
                                option.id
                              )
                                submitOperationRef.current = null;
                              submitExercise.reset();
                              setExerciseState((current) => ({
                                stepKey,
                                selectedOption: option.id,
                                result:
                                  current.stepKey === stepKey
                                    ? current.result
                                    : null,
                                correcting:
                                  current.stepKey === stepKey
                                    ? current.correcting
                                    : false,
                              }));
                            }}
                          />
                          <i>{option.id.toUpperCase()}</i>
                          <span>{option.text}</span>
                          {resultSelected && exerciseResult?.correct && (
                            <Check size={19} aria-hidden="true" />
                          )}
                          {resultSelected &&
                            exerciseResult &&
                            !exerciseResult.correct && (
                              <XCircle size={19} aria-hidden="true" />
                            )}
                        </label>
                      );
                    })}
                  </fieldset>

                  {submitExercise.isError && (
                    <p className="course-inline-error" role="alert">
                      答案暂时无法提交，请稍后再试。
                    </p>
                  )}

                  {exerciseResult && (
                    <div
                      ref={exerciseFeedbackRef}
                      className={
                        exerciseResult.correct
                          ? "course-exercise-feedback is-correct"
                          : "course-exercise-feedback is-wrong"
                      }
                    >
                      <div
                        className="course-feedback-title"
                        ref={exerciseFeedbackTitleRef}
                        tabIndex={-1}
                      >
                        {exerciseResult.correct ? (
                          <CheckCircle2 size={22} aria-hidden="true" />
                        ) : (
                          <CircleAlert size={22} aria-hidden="true" />
                        )}
                        <div>
                          <strong>
                            {exerciseResult.correct ? "答对了" : "再想一想"}
                          </strong>
                          <p>{exerciseResult.hint}</p>
                        </div>
                      </div>
                      <div className="course-feedback-analysis">
                        <span>
                          <Lightbulb size={17} aria-hidden="true" />
                          详细分析
                        </span>
                        <p>{exerciseResult.analysis}</p>
                        <ul>
                          {step.exercise.options.map((option) => (
                            <li key={option.id}>
                              <strong>{option.id.toUpperCase()}</strong>
                              <span>{optionAnalysis.get(option.id)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {step.completed && !exerciseResult && (
                    <div className="course-practice-complete" role="status">
                      <CheckCircle2 size={22} aria-hidden="true" />
                      <div>
                        <strong>本节练习已经完成</strong>
                        <p>你的学习记录已恢复，可以直接进入下一节。</p>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>

            <div className="course-lesson-actions">
              <CourseActionDock
                action={action}
                onAction={executeCourseAction}
              />
              {complete.isError && (
                <p
                  className="course-inline-error course-footer-error"
                  role="alert"
                >
                  进度保存失败，请重试。
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
