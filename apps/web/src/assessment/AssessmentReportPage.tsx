import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileText,
  Lightbulb,
  Printer,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useParams } from "react-router-dom";
import type { AssessmentReportPayload } from "@orosaga/contracts";
import { assessmentApi } from "../lib/assessment-api";
import { AssessmentLayout, AssessmentPageState } from "./AssessmentLayout";
import { ReportCharts } from "./ReportCharts";
import {
  formatDuration,
  internalLearningPath,
  learningPathLabel,
} from "./assessment-utils";
import { reportChartCount } from "./report-chart-count";

type ReportMode = "screen" | "core-print" | "answers-print";

function LearningPathList({
  paths,
  emptyCopy = "依据复核人安排",
}: {
  paths: string[];
  emptyCopy?: string;
}) {
  if (!paths.length) return <>{emptyCopy}</>;
  return (
    <span className="assessment-learning-path-list">
      {paths.map((path, index) => {
        const href = internalLearningPath(path);
        const label = learningPathLabel(path);
        return href ? (
          <a href={href} key={`${path}-${index}`}>
            {label}
          </a>
        ) : (
          <span key={`${path}-${index}`}>{label}</span>
        );
      })}
    </span>
  );
}

function RecommendationSection({
  payload,
}: {
  payload: AssessmentReportPayload;
}) {
  return (
    <section
      className="assessment-report-section"
      aria-labelledby="recommendation-title"
    >
      <header>
        <span className="eyebrow">Action plan · 行动建议</span>
        <h2 id="recommendation-title">接下来优先练什么</h2>
        <p>系统只在同类误区出现至少两次时生成建议，减少偶然错误带来的误判。</p>
      </header>
      {payload.recommendations.length ? (
        <div className="assessment-recommendations">
          {payload.recommendations.map((item) => (
            <article key={item.priority}>
              <span className="assessment-priority">P{item.priority}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.reason}</p>
                <dl>
                  <div>
                    <dt>学习路径</dt>
                    <dd>
                      <LearningPathList paths={item.learningPaths} />
                    </dd>
                  </div>
                  <div>
                    <dt>实践任务</dt>
                    <dd>{item.practice}</dd>
                  </div>
                  <div>
                    <dt>完成标准</dt>
                    <dd>{item.completionCriteria}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="assessment-report-empty">
          <CheckCircle2 aria-hidden="true" />
          <p>
            本次没有重复出现两次以上的同类误区。可继续查看逐题解析，巩固零散错题。
          </p>
        </div>
      )}
    </section>
  );
}

function QuestionAnalysis({
  payload,
  expandAll = false,
}: {
  payload: AssessmentReportPayload;
  expandAll?: boolean;
}) {
  return (
    <section
      className="assessment-report-section assessment-question-analysis"
      aria-labelledby="question-analysis-title"
    >
      <header>
        <span className="eyebrow">Answer review · 逐题解析</span>
        <h2 id="question-analysis-title">答案、原理与业务应用</h2>
        <p>每道题都保留你的选择、标准答案、选项解析和证据编号。</p>
      </header>
      <div className="assessment-analysis-list">
        {payload.questionResults.map((item) => (
          <details key={item.questionId} open={expandAll || undefined}>
            <summary>
              <span className={item.correct ? "is-correct" : "is-incorrect"}>
                {item.correct ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <XCircle aria-hidden="true" />
                )}
              </span>
              <span>第 {item.position} 题</span>
              <strong>{item.stem}</strong>
              <small>
                {item.correct
                  ? "回答正确"
                  : item.selectedOptionId
                    ? "回答错误"
                    : "未作答"}
              </small>
            </summary>
            <div className="assessment-analysis-body">
              <ol className="assessment-analysis-options">
                {item.options.map((option, optionIndex) => (
                  <li
                    className={`${option.correct ? "is-correct" : ""} ${option.selected ? "is-selected" : ""}`}
                    key={option.id}
                  >
                    <span>{optionIndex + 1}</span>
                    <div>
                      <strong>{option.text}</strong>
                      <p>{option.rationale}</p>
                    </div>
                    <small>
                      {option.correct
                        ? "标准答案"
                        : option.selected
                          ? "你的答案"
                          : ""}
                    </small>
                  </li>
                ))}
              </ol>
              <div className="assessment-rationale-grid">
                <article>
                  <h4>
                    <Lightbulb aria-hidden="true" />
                    核心原理
                  </h4>
                  <p>{item.coreRationale}</p>
                  <ol>
                    {item.reasoningSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </article>
                <article>
                  <h4>
                    <BookOpenCheck aria-hidden="true" />
                    业务应用
                  </h4>
                  <p>{item.businessApplication}</p>
                  <dl>
                    <div>
                      <dt>证据</dt>
                      <dd>{item.sourceIds.join("、")}</dd>
                    </div>
                    <div>
                      <dt>复习</dt>
                      <dd>
                        <LearningPathList
                          paths={item.learningPaths}
                          emptyCopy="暂无追加路径"
                        />
                      </dd>
                    </div>
                  </dl>
                </article>
              </div>
              <p className="assessment-question-metadata">
                用时 {formatDuration(item.activeDurationMs)} · 修改{" "}
                {item.changeCount} 次 · 业务重要度 {item.businessImportance}/5
              </p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function AssessmentReportView({ mode }: { mode: ReportMode }) {
  const { attemptId = "" } = useParams();
  const report = useQuery({
    queryKey: ["assessment-report", attemptId],
    queryFn: () => assessmentApi.report(attemptId),
    enabled: Boolean(attemptId),
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING" ? 1200 : false,
  });
  useEffect(() => {
    if (mode === "screen") return;
    const previous = document.title;
    document.title =
      mode === "answers-print" ? "GEO 测评逐题解析" : "GEO 能力诊断报告";
    return () => {
      document.title = previous;
    };
  }, [mode]);

  if (report.isPending)
    return (
      <AssessmentPageState
        title="正在生成诊断报告"
        message="系统正在整理答题结果与多维分析…"
      />
    );
  if (report.isError)
    return (
      <AssessmentPageState
        title="报告加载失败"
        message={report.error.message}
        action={
          <button type="button" onClick={() => void report.refetch()}>
            重新加载
          </button>
        }
      />
    );
  if (report.data.failureCode === "DETAIL_RETENTION_EXPIRED")
    return (
      <AssessmentPageState
        title="逐题解析已超过保留期"
        message="本次成绩摘要仍然保留，详细答案和个人诊断报告已按数据保留规则清理。"
        action={
          <a className="assessment-primary" href="/assessment/geo-foundations">
            返回测评首页
          </a>
        }
      />
    );
  if (report.data.failureCode === "ATTEMPT_VOIDED_SENSITIVE")
    return (
      <AssessmentPageState
        title="本次报告已撤回"
        message="管理员因内容或安全原因作废了本次测评，答案与逐题解析已停止提供。"
        action={
          <a className="assessment-primary" href="/assessment/geo-foundations">
            返回测评首页
          </a>
        }
      />
    );
  if (report.data.status !== "READY" || !report.data.payload)
    return (
      <AssessmentPageState
        title="报告暂时没有生成"
        message="评分已经保留，请稍后重新生成报告。"
        action={
          <button type="button" onClick={() => void report.refetch()}>
            重新生成
          </button>
        }
      />
    );

  const payload = report.data.payload;
  const weakest = [...payload.dimensions].sort(
    (a, b) => a.accuracy - b.accuracy,
  )[0];
  const topMisconception = payload.misconceptions[0];
  const showCore = mode !== "answers-print";
  const showAnswers = mode === "answers-print";
  const chartCount = reportChartCount(payload);

  return (
    <AssessmentLayout reportCanvas>
      <main
        className={`assessment-report ${mode === "screen" ? "is-screen" : "is-print"}`}
      >
        <nav className="assessment-report-tools" aria-label="报告操作">
          <a href="/assessment/geo-foundations">
            <ArrowLeft size={16} aria-hidden="true" />
            返回测评首页
          </a>
          <div>
            {mode === "screen" && (
              <>
                <a
                  href={`/assessment/geo-foundations/report/${attemptId}/print`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText size={16} aria-hidden="true" />
                  打印核心报告
                </a>
                <a
                  href={`/assessment/geo-foundations/report/${attemptId}/print/answers`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download size={16} aria-hidden="true" />
                  打印答案附录
                </a>
              </>
            )}
            {mode !== "screen" && (
              <button type="button" onClick={() => window.print()}>
                <Printer size={16} aria-hidden="true" />
                打印或保存 PDF
              </button>
            )}
          </div>
        </nav>

        {report.data.voided && (
          <div className="assessment-voided-banner">
            本次记录已由管理员作废，不计入次数与正式成绩。
          </div>
        )}

        {showCore && (
          <>
            <header className="assessment-report-cover">
              <div>
                <span className="eyebrow">
                  GEO capability diagnosis · 能力诊断
                </span>
                <h1 aria-label="GEO 基础能力测评报告">
                  <span>GEO 基础能力</span>
                  <span>测评报告</span>
                </h1>
                <p>
                  第 {report.data.attempt.attemptNumber} 次测评 · 题库{" "}
                  {report.data.attempt.version} ·{" "}
                  {new Date(payload.generatedAt).toLocaleString("zh-CN")}
                </p>
              </div>
              <div
                className={
                  payload.passed
                    ? "assessment-report-score is-passed"
                    : "assessment-report-score"
                }
              >
                <strong>{payload.score}</strong>
                <span>/ 100</span>
                <small>
                  {payload.passed
                    ? "达到通过线"
                    : `通过线 ${payload.passScore}`}
                </small>
              </div>
            </header>

            <section
              className="assessment-report-summary"
              aria-labelledby="report-summary-title"
            >
              <div>
                <span className="eyebrow">Executive summary · 总结</span>
                <h2 id="report-summary-title">这次结果说明什么</h2>
              </div>
              <div className="assessment-summary-grid">
                <article>
                  <strong>{payload.passed ? "已通过" : "继续巩固"}</strong>
                  <p>
                    本次得分 {payload.score}，通过线为 {payload.passScore}。
                  </p>
                </article>
                <article>
                  <strong>{weakest?.label ?? "暂无维度数据"}</strong>
                  <p>
                    {weakest
                      ? `当前正确率 ${Math.round(weakest.accuracy * 100)}%，建议优先复盘。`
                      : "暂无可分析数据。"}
                  </p>
                </article>
                <article>
                  <strong>{topMisconception?.label ?? "未形成高频误区"}</strong>
                  <p>
                    {topMisconception
                      ? `涉及 ${topMisconception.count} 道题。`
                      : "错误分布较为分散。"}
                  </p>
                </article>
                <article>
                  <strong>
                    {formatDuration(payload.timing.totalDurationMs)}
                  </strong>
                  <p>
                    本次累计有效答题时间，平均每题{" "}
                    {formatDuration(payload.timing.averageDurationMs)}。
                  </p>
                </article>
              </div>
            </section>

            <section
              className="assessment-report-section"
              aria-labelledby="charts-title"
            >
              <header>
                <span className="eyebrow">Evidence view · 多维分析</span>
                <h2 id="charts-title">从 {chartCount} 个视角读取结果</h2>
                <p>每张图都可展开查看原始数据，打印版保留同一套结论。</p>
              </header>
              <ReportCharts payload={payload} />
            </section>
            <RecommendationSection payload={payload} />
          </>
        )}

        {showAnswers && (
          <QuestionAnalysis
            payload={payload}
            expandAll={mode === "answers-print"}
          />
        )}

        {mode === "screen" && (
          <footer className="assessment-report-footer">
            <div>
              <RotateCcw aria-hidden="true" />
              <span>
                如需再次测评，请回到测评首页查看下一次可用时间与剩余次数。
              </span>
            </div>
            <a
              className="assessment-primary"
              href="/assessment/geo-foundations"
            >
              返回测评首页
            </a>
          </footer>
        )}
      </main>
    </AssessmentLayout>
  );
}

export default function AssessmentReportPage() {
  return <AssessmentReportView mode="screen" />;
}

export function AssessmentPrintPage() {
  return <AssessmentReportView mode="core-print" />;
}

export function AssessmentAnswersPrintPage() {
  return <AssessmentReportView mode="answers-print" />;
}
