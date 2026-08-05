import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Send,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { assessmentApi } from "../lib/assessment-api";
import { AssessmentLayout, AssessmentPageState } from "./AssessmentLayout";
import { AssessmentDialog } from "./AssessmentDialog";
import { ASSESSMENT_DURATION_MS, formatDuration } from "./assessment-utils";
import { useDialogFocus } from "./use-dialog-focus";

export default function AssessmentReviewPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [now, setNow] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const review = useQuery({
    queryKey: ["assessment-review", id],
    queryFn: () => assessmentApi.review(id),
    enabled: Boolean(id),
  });
  const submit = useMutation({
    mutationFn: () => assessmentApi.submit(id),
    onSuccess: () =>
      navigate(`/assessment/geo-foundations/report/${id}`, { replace: true }),
  });
  const closeSubmitDialog = () => {
    submit.reset();
    setConfirming(false);
  };
  const [submitDialogRef, onSubmitDialogKeyDown] = useDialogFocus<HTMLElement>({
    open: confirming,
    closeEnabled: !submit.isPending,
    onClose: closeSubmitDialog,
  });

  useEffect(() => {
    const update = () => setNow(new Date().getTime());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const deadline = review.data?.attempt.deadlineAt;
    if (deadline && new Date(deadline).getTime() <= now)
      navigate(`/assessment/geo-foundations/report/${id}`, { replace: true });
  }, [id, navigate, now, review.data]);

  if (review.isPending)
    return <AssessmentPageState title="正在整理答题卡" message="马上就好…" />;
  if (review.isError)
    return (
      <AssessmentPageState
        title="答题卡加载失败"
        message={review.error.message}
        action={
          <button type="button" onClick={() => void review.refetch()}>
            重新加载
          </button>
        }
      />
    );

  const { attempt, items } = review.data;
  if (attempt.status !== "IN_PROGRESS")
    return (
      <AssessmentPageState
        title="本次测评已经结束"
        message="诊断报告已经可以查看。"
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
  const unanswered = items.filter((item) => !item.answered).length;
  const remaining = Math.min(
    ASSESSMENT_DURATION_MS,
    Math.max(0, new Date(attempt.deadlineAt).getTime() - now),
  );

  return (
    <AssessmentLayout compact>
      <main className="assessment-review-page">
        <header className="assessment-review-heading">
          <div>
            <span className="eyebrow">Review · 答题检查</span>
            <h1>交卷前，再看一遍</h1>
            <p>
              已答 {items.length - unanswered} 题，未答 {unanswered}{" "}
              题。点击题号可返回修改。
            </p>
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
          className="assessment-answer-sheet"
          aria-label="50 道题答题状态"
        >
          {items.map((item) => (
            <a
              className={item.answered ? "is-answered" : "is-unanswered"}
              href={`/assessment/geo-foundations/attempt/${id}/question/${item.position}`}
              key={item.questionId}
              aria-label={`第 ${item.position} 题，${item.answered ? "已答" : "未答"}`}
            >
              {item.position}
            </a>
          ))}
        </section>

        <div className="assessment-answer-legend">
          <span>
            <i className="is-answered" />
            已作答
          </span>
          <span>
            <i className="is-unanswered" />
            未作答
          </span>
        </div>

        {unanswered > 0 && (
          <div className="assessment-warning">
            <AlertCircle aria-hidden="true" />
            <div>
              <strong>还有 {unanswered} 道题未作答</strong>
              <span>未答题会按错误计分。</span>
            </div>
          </div>
        )}
        <div className="assessment-review-actions">
          <button
            type="button"
            onClick={() =>
              navigate(
                `/assessment/geo-foundations/attempt/${id}/question/${Math.min(50, Math.max(1, items.find((item) => !item.answered)?.position ?? 50))}`,
              )
            }
          >
            <ArrowLeft size={17} aria-hidden="true" />{" "}
            {unanswered ? "前往未答题" : "返回检查"}
          </button>
          <button
            className="assessment-primary"
            type="button"
            onClick={() => {
              submit.reset();
              setConfirming(true);
            }}
          >
            <Send size={16} aria-hidden="true" /> 提交答卷
          </button>
        </div>

        {confirming && (
          <AssessmentDialog>
            <section
              className="assessment-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="submit-title"
              ref={submitDialogRef}
              onKeyDown={onSubmitDialogKeyDown}
            >
              <CheckCircle2 aria-hidden="true" />
              <h2 id="submit-title">确认提交答卷？</h2>
              <p>提交后答案无法修改，系统会立即评分并生成诊断报告。</p>
              {unanswered > 0 && (
                <p className="assessment-dialog-warning">
                  当前仍有 {unanswered} 道题未作答。
                </p>
              )}
              {submit.isError && (
                <p className="assessment-error" role="alert">
                  {submit.error.message}
                </p>
              )}
              <div>
                <button
                  type="button"
                  disabled={submit.isPending}
                  onClick={closeSubmitDialog}
                >
                  继续检查
                </button>
                <button
                  className="assessment-primary"
                  type="button"
                  data-dialog-initial-focus
                  disabled={submit.isPending}
                  onClick={() => submit.mutate()}
                >
                  {submit.isPending
                    ? "正在交卷…"
                    : submit.isError
                      ? "重新提交"
                      : "确认提交"}
                </button>
              </div>
            </section>
          </AssessmentDialog>
        )}
      </main>
    </AssessmentLayout>
  );
}
