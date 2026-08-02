import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Clock3, Grid3X3 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  AssessmentAttemptDetail,
  AssessmentQuestion,
} from "@orosaga/contracts";
import { ApiError } from "../lib/api";
import { assessmentApi } from "../lib/assessment-api";
import { ActiveDurationTracker } from "./assessment-active-time";
import { AssessmentLayout, AssessmentPageState } from "./AssessmentLayout";
import { ASSESSMENT_DURATION_MS, formatDuration } from "./assessment-utils";

const dimensionLabels = {
  D1: "概念与数据边界",
  D2: "研究与测量",
  D3: "策略与内容优化",
  D4: "交付与业务应用",
  D5: "风险与治理",
};
const difficultyLabels = { L1: "基础识别", L2: "场景应用", L3: "综合判断" };
const isPageActive = () =>
  document.visibilityState === "visible" && document.hasFocus();

function useCountdown(deadline?: string) {
  const [remaining, setRemaining] = useState(() =>
    deadline
      ? Math.min(
          ASSESSMENT_DURATION_MS,
          Math.max(0, new Date(deadline).getTime() - Date.now()),
        )
      : 0,
  );
  useEffect(() => {
    if (!deadline) return;
    const update = () =>
      setRemaining(
        Math.min(
          ASSESSMENT_DURATION_MS,
          Math.max(0, new Date(deadline).getTime() - Date.now()),
        ),
      );
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  return remaining;
}

export default function AssessmentQuestionPage() {
  const { id = "", position: rawPosition = "1" } = useParams();
  const position = Math.min(50, Math.max(1, Number(rawPosition) || 1));
  const navigate = useNavigate();
  const client = useQueryClient();
  const activeDuration = useRef<ActiveDurationTracker | null>(null);
  const [saveState, setSaveState] = useState({ position: 0, message: "" });

  const attempt = useQuery({
    queryKey: ["assessment-attempt", id],
    queryFn: () => assessmentApi.attempt(id),
    enabled: Boolean(id),
  });
  const question = useQuery({
    queryKey: ["assessment-question", id, position],
    queryFn: () => assessmentApi.question(id, position),
    enabled: Boolean(id),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 410) && count < 2,
  });
  const remaining = useCountdown(attempt.data?.deadlineAt);

  useEffect(() => {
    const now = performance.now();
    if (activeDuration.current)
      activeDuration.current.reset(now, isPageActive());
    else
      activeDuration.current = new ActiveDurationTracker(now, isPageActive());
  }, [id, position]);

  useEffect(() => {
    const syncActivity = () =>
      activeDuration.current?.setActive(isPageActive(), performance.now());
    window.addEventListener("focus", syncActivity);
    window.addEventListener("blur", syncActivity);
    document.addEventListener("visibilitychange", syncActivity);
    return () => {
      window.removeEventListener("focus", syncActivity);
      window.removeEventListener("blur", syncActivity);
      document.removeEventListener("visibilitychange", syncActivity);
    };
  }, []);

  useEffect(() => {
    if (
      attempt.data &&
      remaining === 0 &&
      new Date(attempt.data.deadlineAt).getTime() <= Date.now()
    )
      navigate(`/assessment/geo-foundations/report/${id}`, { replace: true });
  }, [attempt.data, id, navigate, remaining]);

  const save = useMutation({
    mutationFn: ({
      optionId,
      revision,
    }: {
      optionId: "a" | "b" | "c" | "d";
      revision: number;
    }) =>
      assessmentApi.saveAnswer(id, question.data!.id, {
        selectedOptionId: optionId,
        revision,
        activeDurationMs: activeDuration.current?.read(performance.now()) ?? 0,
      }),
    onMutate: (input) => {
      client.setQueryData<AssessmentQuestion>(
        ["assessment-question", id, position],
        (current) =>
          current ? { ...current, selectedOptionId: input.optionId } : current,
      );
    },
    onSuccess: (result, input) => {
      activeDuration.current?.reset(performance.now(), isPageActive());
      client.setQueryData<AssessmentQuestion>(
        ["assessment-question", id, position],
        (current) =>
          current
            ? {
                ...current,
                selectedOptionId: input.optionId,
                answerRevision: result.revision,
              }
            : current,
      );
      client.setQueryData<AssessmentAttemptDetail>(
        ["assessment-attempt", id],
        (current) =>
          current
            ? { ...current, answeredCount: result.answeredCount }
            : current,
      );
      setSaveState({ position, message: "答案已保存" });
    },
    onError: async (error) => {
      const isConflict =
        error instanceof ApiError && error.code === "ANSWER_VERSION_CONFLICT";
      setSaveState({
        position,
        message: isConflict
          ? "答案在其他设备更新，已同步最新内容"
          : "保存失败，当前选择已保留，请重试",
      });
      if (isConflict) await question.refetch();
    },
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || save.isPending)
        return;
      const option = question.data?.options[Number(event.key) - 1];
      if (!option) return;
      event.preventDefault();
      save.mutate({
        optionId: option.id,
        revision: question.data!.answerRevision,
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [question.data, save]);

  if (attempt.isPending || question.isPending)
    return (
      <AssessmentPageState
        title="正在打开题目"
        message="正在恢复你的答题进度…"
      />
    );
  if (question.error instanceof ApiError && question.error.status === 410)
    return (
      <AssessmentPageState
        title="本次测评已经结束"
        message="答题时间已结束，诊断报告正在生成。"
        action={
          <a
            className="assessment-primary"
            href={`/assessment/geo-foundations/report/${id}`}
          >
            查看报告
          </a>
        }
      />
    );
  if (attempt.isError || question.isError)
    return (
      <AssessmentPageState
        title="题目加载失败"
        message={(attempt.error ?? question.error)?.message ?? "请稍后重试。"}
        action={
          <button
            type="button"
            onClick={() =>
              void Promise.all([attempt.refetch(), question.refetch()])
            }
          >
            重新加载
          </button>
        }
      />
    );

  const item = question.data;
  const detail = attempt.data;
  const go = (next: number) =>
    navigate(`/assessment/geo-foundations/attempt/${id}/question/${next}`);

  return (
    <AssessmentLayout compact>
      <main className="assessment-question-page">
        <header className="assessment-progress-header">
          <div>
            <span>
              第 {position} / {detail.questionCount} 题
            </span>
            <strong>
              {Math.round((position / detail.questionCount) * 100)}%
            </strong>
          </div>
          <div
            className="assessment-progress-track"
            aria-label={`答题进度 ${position} / ${detail.questionCount}`}
          >
            <span
              style={{ width: `${(position / detail.questionCount) * 100}%` }}
            />
          </div>
          <div
            className={
              remaining < 300_000
                ? "assessment-timer is-urgent"
                : "assessment-timer"
            }
          >
            <Clock3 size={17} aria-hidden="true" />
            <span>剩余</span>
            <strong>{formatDuration(remaining)}</strong>
            {remaining <= 300_000 && (
              <small>{remaining <= 60_000 ? "即将结束" : "请抓紧"}</small>
            )}
            <span className="sr-only" aria-live="polite">
              {remaining <= 60_000
                ? "测评剩余时间不足一分钟"
                : remaining <= 300_000
                  ? "测评剩余时间不足五分钟"
                  : ""}
            </span>
          </div>
        </header>

        <section
          className="assessment-question-card"
          aria-labelledby="question-title"
        >
          <div className="assessment-question-meta">
            <span>{dimensionLabels[item.primaryDimension]}</span>
            <span>{difficultyLabels[item.difficulty]}</span>
            <span>{detail.answeredCount} 题已答</span>
          </div>
          <h1 id="question-title">{item.stem}</h1>
          <p className="assessment-keyboard-hint">按数字键 1 至 4 可快速选择</p>
          <fieldset className="assessment-options" disabled={save.isPending}>
            <legend className="sr-only">请选择一个答案</legend>
            {item.options.map((option, index) => (
              <label
                className={
                  item.selectedOptionId === option.id
                    ? "assessment-option is-selected"
                    : "assessment-option"
                }
                key={option.id}
              >
                <input
                  type="radio"
                  name={`question-${item.id}`}
                  value={option.id}
                  checked={item.selectedOptionId === option.id}
                  onChange={() =>
                    save.mutate({
                      optionId: option.id,
                      revision: item.answerRevision,
                    })
                  }
                />
                <span className="assessment-option-key">{index + 1}</span>
                <span>{option.text}</span>
                <Check
                  className="assessment-option-check"
                  size={19}
                  aria-hidden="true"
                />
              </label>
            ))}
          </fieldset>
          <p
            className={
              save.isError
                ? "assessment-save-state is-error"
                : "assessment-save-state"
            }
            aria-live="polite"
          >
            {save.isPending
              ? "正在保存…"
              : saveState.position === position
                ? saveState.message
                : ""}
          </p>
          {save.isError &&
            saveState.position === position &&
            !(
              save.error instanceof ApiError &&
              save.error.code === "ANSWER_VERSION_CONFLICT"
            ) &&
            save.variables && (
              <button
                className="assessment-save-retry"
                type="button"
                onClick={() => save.mutate(save.variables!)}
              >
                重试保存
              </button>
            )}
        </section>

        <nav className="assessment-question-nav" aria-label="题目导航">
          <button
            type="button"
            disabled={position === 1 || save.isPending}
            onClick={() => go(position - 1)}
          >
            <ArrowLeft size={17} aria-hidden="true" /> 上一题
          </button>
          <a
            href={`/assessment/geo-foundations/attempt/${id}/review`}
            aria-disabled={save.isPending}
            onClick={(event) => {
              if (save.isPending) event.preventDefault();
            }}
          >
            <Grid3X3 size={16} aria-hidden="true" /> 答题卡
          </a>
          {position < detail.questionCount ? (
            <button
              type="button"
              disabled={
                !item.selectedOptionId ||
                save.isPending ||
                (save.isError && saveState.position === position)
              }
              onClick={() => go(position + 1)}
            >
              下一题 <ArrowRight size={17} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              disabled={
                !item.selectedOptionId ||
                save.isPending ||
                (save.isError && saveState.position === position)
              }
              onClick={() =>
                navigate(`/assessment/geo-foundations/attempt/${id}/review`)
              }
            >
              检查并交卷 <ArrowRight size={17} aria-hidden="true" />
            </button>
          )}
        </nav>
      </main>
    </AssessmentLayout>
  );
}
