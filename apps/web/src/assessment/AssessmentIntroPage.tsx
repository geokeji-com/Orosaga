import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileCheck2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../lib/api";
import { assessmentApi } from "../lib/assessment-api";
import { AssessmentLayout } from "./AssessmentLayout";
import { useDialogFocus } from "./use-dialog-focus";

const statusCopy = {
  DAILY_LIMIT_REACHED: "今天的测评机会已经使用，请在下一自然日再试。",
  ATTEMPT_LIMIT_REACHED: "本周期 3 次测评机会已经用完。",
  REVIEW_REQUIRED: "题库证据正在复核，完成后会重新开放。",
  UNAVAILABLE: "测评尚未开放，请稍后查看。",
} as const;

export default function AssessmentIntroPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const startKey = useRef(crypto.randomUUID());
  const overview = useQuery({
    queryKey: ["assessment", "geo-foundations"],
    queryFn: assessmentApi.overview,
  });
  const start = useMutation({
    mutationFn: () => assessmentApi.createAttempt(startKey.current),
    onSuccess: async (attempt) => {
      setConfirming(false);
      await client.invalidateQueries({ queryKey: ["assessment"] });
      navigate(`/assessment/geo-foundations/attempt/${attempt.id}/question/1`);
    },
    onError: () => setConfirming(false),
  });
  const [startDialogRef, onStartDialogKeyDown] = useDialogFocus<HTMLElement>({
    open: confirming,
    closeEnabled: !start.isPending,
    onClose: () => setConfirming(false),
  });

  if (overview.isPending)
    return (
      <AssessmentLayout>
        <main className="assessment-state">正在确认测评资格…</main>
      </AssessmentLayout>
    );
  if (overview.isError)
    return (
      <AssessmentLayout>
        <main className="assessment-state">
          <h1>暂时无法读取测评</h1>
          <p>{overview.error.message}</p>
          <button type="button" onClick={() => void overview.refetch()}>
            重新加载
          </button>
        </main>
      </AssessmentLayout>
    );

  const data = overview.data;
  const canStart = data.status === "AVAILABLE";
  const hasActive = data.status === "IN_PROGRESS" && data.activeAttemptId;
  const blockedMessage =
    data.status in statusCopy
      ? statusCopy[data.status as keyof typeof statusCopy]
      : null;
  const mutationMessage =
    start.error instanceof ApiError
      ? start.error.message
      : start.error?.message;

  return (
    <AssessmentLayout>
      <main className="assessment-intro">
        <section className="assessment-intro-hero">
          <div>
            <span className="eyebrow">Newcomer assessment · 新人测评</span>
            <h1>GEO 基础能力测评</h1>
            <p>
              结合论文证据、原始数据与移山业务场景，评估你的 GEO
              研究、策略、交付与治理能力。
            </p>
          </div>
          <div className="assessment-score-seal" aria-label="测评满分 100 分">
            <strong>100</strong>
            <span>满分</span>
          </div>
        </section>

        <section className="assessment-rule-grid" aria-label="测评规则">
          <article>
            <FileCheck2 aria-hidden="true" />
            <strong>50 道单选题</strong>
            <span>每题 4 个选项，每题 2 分</span>
          </article>
          <article>
            <Clock3 aria-hidden="true" />
            <strong>30 分钟</strong>
            <span>到时自动交卷，可提前提交</span>
          </article>
          <article>
            <RotateCcw aria-hidden="true" />
            <strong>最多 3 次</strong>
            <span>每天最多参加 1 次</span>
          </article>
          <article>
            <BarChart3 aria-hidden="true" />
            <strong>多维诊断</strong>
            <span>提交后查看答案、解析与建议</span>
          </article>
        </section>

        <section className="assessment-ready-card">
          <div className="assessment-ready-copy">
            <span className="eyebrow">Before you begin · 开始前</span>
            <h2>准备一段连续、安静的时间</h2>
            <ul>
              <li>
                <CheckCircle2 aria-hidden="true" />
                选择答案后会自动保存，可返回修改。
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                题目顺序与选项顺序会为每次测评重新排列。
              </li>
              <li>
                <ShieldCheck aria-hidden="true" />
                提交前不展示标准答案，提交后生成完整诊断。
              </li>
            </ul>
          </div>
          <div className="assessment-start-panel">
            <dl>
              <div>
                <dt>已使用</dt>
                <dd>
                  {data.attemptsUsed} / {data.maxAttempts} 次
                </dd>
              </div>
              <div>
                <dt>剩余机会</dt>
                <dd>{data.attemptsRemaining} 次</dd>
              </div>
              <div>
                <dt>通过线</dt>
                <dd>{data.passScore ?? "待发布"} 分</dd>
              </div>
              <div>
                <dt>最好成绩</dt>
                <dd>{data.bestScore ?? "暂无"}</dd>
              </div>
            </dl>
            {blockedMessage && (
              <p className="assessment-notice">{blockedMessage}</p>
            )}
            {mutationMessage && (
              <p className="assessment-error" role="alert">
                {mutationMessage}
              </p>
            )}
            {hasActive ? (
              <button
                className="assessment-primary"
                type="button"
                onClick={() =>
                  navigate(
                    `/assessment/geo-foundations/attempt/${data.activeAttemptId}/question/1`,
                  )
                }
              >
                继续本次测评 <ArrowRight size={17} aria-hidden="true" />
              </button>
            ) : (
              <button
                className="assessment-primary"
                type="button"
                disabled={!canStart || start.isPending}
                onClick={() => {
                  start.reset();
                  setConfirming(true);
                }}
              >
                {start.isPending ? "正在创建…" : "开始测评"}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        </section>

        {data.history.length > 0 && (
          <section
            className="assessment-history"
            aria-labelledby="assessment-history-title"
          >
            <div>
              <span className="eyebrow">Attempts · 历次测评</span>
              <h2 id="assessment-history-title">你的测评记录</h2>
            </div>
            <div className="assessment-history-list">
              {data.history.map((attempt) => (
                <a
                  href={`/assessment/geo-foundations/report/${attempt.id}`}
                  key={attempt.id}
                >
                  <span>第 {attempt.attemptNumber} 次</span>
                  <strong>{attempt.score ?? 0} 分</strong>
                  <time>
                    {new Date(
                      attempt.submittedAt ?? attempt.deadlineAt,
                    ).toLocaleDateString("zh-CN")}
                  </time>
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              ))}
            </div>
          </section>
        )}
        {confirming && (
          <div className="assessment-dialog-backdrop" role="presentation">
            <section
              className="assessment-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="start-confirm-title"
              ref={startDialogRef}
              onKeyDown={onStartDialogKeyDown}
            >
              <Clock3 aria-hidden="true" />
              <h2 id="start-confirm-title">确认开始测评？</h2>
              <p>
                确认后立即开始 30 分钟计时，同时占用当天和本周期的一次测评机会。
              </p>
              <div>
                <button
                  type="button"
                  disabled={start.isPending}
                  onClick={() => setConfirming(false)}
                >
                  再准备一下
                </button>
                <button
                  className="assessment-primary"
                  type="button"
                  data-dialog-initial-focus
                  disabled={start.isPending}
                  onClick={() => start.mutate()}
                >
                  {start.isPending ? "正在创建…" : "确认开始"}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </AssessmentLayout>
  );
}
