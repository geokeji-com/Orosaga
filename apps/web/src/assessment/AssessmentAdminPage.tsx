import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileCheck2,
  Flag,
  ShieldCheck,
} from "lucide-react";
import { AccountMenu } from "../components/AccountMenu";
import type { Employee } from "@orosaga/contracts";
import {
  assessmentApi,
  type AssessmentAdminAttempt,
  type AssessmentVersionSummary,
} from "../lib/assessment-api";
import { api } from "../lib/api";
import { formatDuration } from "./assessment-utils";
import { useDialogFocus } from "./use-dialog-focus";
import { AssessmentDialog } from "./AssessmentDialog";
import "../styles/assessment.css";

const statusLabels = {
  DRAFT: "草稿",
  VALIDATED: "机器校验通过",
  PUBLISHED: "已发布",
  RETIRED: "已停用",
  CURRENT: "证据有效",
  REVIEW_REQUIRED: "需要复核",
  PENDING_HUMAN: "等待人工审核",
  APPROVED: "人工已批准",
  IN_PROGRESS: "答题中",
  SUBMITTED: "已提交",
  EXPIRED: "超时提交",
  VOIDED: "已作废",
} as const;

export default function AssessmentAdminPage() {
  const client = useQueryClient();
  const [gateVersion, setGateVersion] = useState<string | null>(null);
  const [gatePilotStatus, setGatePilotStatus] = useState<
    "PENDING_HUMAN" | "APPROVED"
  >("PENDING_HUMAN");
  const [reviewReference, setReviewReference] = useState("");
  const [passScore, setPassScore] = useState(80);
  const [voiding, setVoiding] = useState<AssessmentAdminAttempt | null>(null);
  const [qualityVersion, setQualityVersion] = useState<string | null>(null);
  const [reportAttempt, setReportAttempt] =
    useState<AssessmentAdminAttempt | null>(null);
  const [pilotVersion, setPilotVersion] =
    useState<AssessmentVersionSummary | null>(null);
  const [pilotQuery, setPilotQuery] = useState("");
  const [confirmingAction, setConfirmingAction] = useState<{
    type: "publish" | "retire";
    id: string;
    target: AssessmentVersionSummary;
  } | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidCode, setVoidCode] = useState<
    "TECHNICAL" | "CONTENT_ERROR" | "SECURITY" | "OTHER"
  >("TECHNICAL");
  const versions = useQuery({
    queryKey: ["admin-assessments"],
    queryFn: assessmentApi.adminVersions,
  });
  const attempts = useQuery({
    queryKey: ["admin-assessment-attempts"],
    queryFn: assessmentApi.adminAttempts,
  });
  const quality = useQuery({
    queryKey: ["admin-assessment-quality", qualityVersion],
    queryFn: () => assessmentApi.adminQuality(qualityVersion!),
    enabled: Boolean(qualityVersion),
  });
  const report = useQuery({
    queryKey: ["admin-assessment-report", reportAttempt?.id],
    queryFn: () => assessmentApi.adminReport(reportAttempt!.id),
    enabled: Boolean(reportAttempt),
  });
  const pilotParticipants = useQuery({
    queryKey: ["assessment-pilot-participants", pilotVersion?.id],
    queryFn: () => assessmentApi.pilotParticipants(pilotVersion!.id),
    enabled: Boolean(pilotVersion),
  });
  const pilotCandidates = useQuery({
    queryKey: ["assessment-pilot-candidates", pilotQuery.trim()],
    queryFn: () =>
      api<{ items: Employee[]; nextCursor: string | null }>(
        `/api/v1/organization/members?q=${encodeURIComponent(pilotQuery.trim())}`,
      ),
    enabled: Boolean(pilotVersion) && pilotQuery.trim().length > 0,
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["admin-assessments"] }),
      client.invalidateQueries({ queryKey: ["admin-assessment-attempts"] }),
    ]);
  };
  const action = useMutation({
    mutationFn: async ({
      type,
      id,
      userId,
    }: {
      type:
        | "validate"
        | "publish"
        | "retire"
        | "gates"
        | "void"
        | "grant-pilot"
        | "revoke-pilot";
      id: string;
      userId?: string;
    }) => {
      if (type === "validate") return assessmentApi.validateVersion(id);
      if (type === "publish") return assessmentApi.publishVersion(id);
      if (type === "retire") return assessmentApi.retireVersion(id);
      if (type === "gates")
        return assessmentApi.approveGates(
          id,
          reviewReference,
          passScore,
          gatePilotStatus,
        );
      if (type === "grant-pilot")
        return assessmentApi.grantPilotParticipant(id, userId!);
      if (type === "revoke-pilot")
        return assessmentApi.revokePilotParticipant(id, userId!);
      return assessmentApi.voidAttempt(id, voidCode, voidReason);
    },
    onSuccess: async (_, variables) => {
      if (
        variables.type === "grant-pilot" ||
        variables.type === "revoke-pilot"
      ) {
        await client.invalidateQueries({
          queryKey: ["assessment-pilot-participants", variables.id],
        });
        return;
      }
      setGateVersion(null);
      setVoiding(null);
      setConfirmingAction(null);
      setReviewReference("");
      setVoidReason("");
      await refresh();
    },
  });
  const closeVoidDialog = () => {
    action.reset();
    setVoiding(null);
    setVoidReason("");
    setVoidCode("TECHNICAL");
  };
  const [voidDialogRef, onVoidDialogKeyDown] = useDialogFocus<HTMLFormElement>({
    open: Boolean(voiding),
    closeEnabled: !action.isPending,
    onClose: () => closeVoidDialog(),
  });
  const [reportDialogRef, onReportDialogKeyDown] = useDialogFocus<HTMLElement>({
    open: Boolean(reportAttempt),
    onClose: () => setReportAttempt(null),
  });
  const closeActionDialog = () => {
    action.reset();
    setConfirmingAction(null);
  };
  const [actionDialogRef, onActionDialogKeyDown] = useDialogFocus<HTMLElement>({
    open: Boolean(confirmingAction),
    closeEnabled: !action.isPending,
    onClose: closeActionDialog,
  });

  return (
    <div className="admin-shell assessment-admin-shell">
      <header className="admin-topbar">
        <a href="/admin">
          <ArrowLeft size={16} aria-hidden="true" />
          <span className="admin-back-label">返回内容后台</span>
        </a>
        <strong>GEO 测评管理</strong>
        <AccountMenu />
      </header>
      <main className="assessment-admin">
        <header className="assessment-admin-heading">
          <div>
            <span className="eyebrow">Assessment operations · 测评运营</span>
            <h1>题库发布与测评记录</h1>
            <p>
              机器校验、内容审核、Angoff
              定标与试测批准全部完成后，题库版本才可发布。
            </p>
          </div>
          <a href="/assessment/geo-foundations">查看员工入口</a>
        </header>

        <section
          className="assessment-admin-section"
          aria-labelledby="version-title"
        >
          <div className="assessment-admin-section-title">
            <FileCheck2 aria-hidden="true" />
            <div>
              <h2 id="version-title">题库版本</h2>
              <p>
                正式题目和答案通过受控导入进入数据库，页面只展示校验与审核状态。
              </p>
            </div>
          </div>
          {versions.isPending && <p>正在读取题库版本…</p>}
          {versions.isError && (
            <p className="assessment-error">{versions.error.message}</p>
          )}
          {versions.data?.length === 0 && (
            <p className="assessment-admin-empty">
              尚未导入题库版本。请先通过受控导入流程创建草稿版本。
            </p>
          )}
          <div className="assessment-version-list">
            {versions.data?.map((version) => (
              <article key={version.id}>
                <header>
                  <div>
                    <span>{version.cycleKey}</span>
                    <h3>
                      {version.title} · {version.version}
                    </h3>
                  </div>
                  <strong
                    className={`assessment-status status-${version.status.toLowerCase()}`}
                  >
                    {statusLabels[version.status]}
                  </strong>
                </header>
                <dl>
                  <div>
                    <dt>题量</dt>
                    <dd>{version.questionCount} / 50</dd>
                  </div>
                  <div>
                    <dt>通过线</dt>
                    <dd>{version.passScore} 分</dd>
                  </div>
                  <div>
                    <dt>证据状态</dt>
                    <dd>{statusLabels[version.sourceReviewStatus]}</dd>
                  </div>
                  <div>
                    <dt>内容审核</dt>
                    <dd>{statusLabels[version.contentReviewStatus]}</dd>
                  </div>
                  <div>
                    <dt>Angoff 定标</dt>
                    <dd>{statusLabels[version.angoffStatus]}</dd>
                  </div>
                  <div>
                    <dt>试测批准</dt>
                    <dd>{statusLabels[version.pilotStatus]}</dd>
                  </div>
                </dl>
                <p className="assessment-hash">
                  <span>内容指纹</span>
                  <code>{version.contentHash}</code>
                </p>
                <p className="assessment-review-due">
                  下次来源复核：
                  {version.reviewDueAt
                    ? new Date(version.reviewDueAt).toLocaleDateString("zh-CN")
                    : "未设置"}
                </p>
                <div className="assessment-admin-actions">
                  <button
                    type="button"
                    onClick={() => setQualityVersion(version.id)}
                  >
                    题目质量
                  </button>
                  <button
                    type="button"
                    disabled={action.isPending || version.status !== "DRAFT"}
                    onClick={() =>
                      action.mutate({ type: "validate", id: version.id })
                    }
                  >
                    机器校验
                  </button>
                  <button
                    type="button"
                    disabled={
                      action.isPending ||
                      (version.status !== "VALIDATED" &&
                        version.status !== "PUBLISHED")
                    }
                    onClick={() => {
                      setGateVersion(version.id);
                      setPassScore(version.passScore);
                      setGatePilotStatus(version.pilotStatus);
                    }}
                  >
                    录入内容 / Angoff
                  </button>
                  <button
                    type="button"
                    disabled={
                      action.isPending ||
                      version.status !== "VALIDATED" ||
                      version.contentReviewStatus !== "APPROVED" ||
                      version.angoffStatus !== "APPROVED" ||
                      version.sourceReviewStatus !== "CURRENT"
                    }
                    onClick={() => {
                      action.reset();
                      setPilotVersion(version);
                      setPilotQuery("");
                    }}
                  >
                    管理试测名单
                  </button>
                  <button
                    type="button"
                    disabled={
                      action.isPending ||
                      version.status !== "VALIDATED" ||
                      version.contentReviewStatus !== "APPROVED" ||
                      version.angoffStatus !== "APPROVED" ||
                      version.sourceReviewStatus !== "CURRENT" ||
                      version.pilotStatus === "APPROVED"
                    }
                    onClick={() => {
                      setGateVersion(version.id);
                      setPassScore(version.passScore);
                      setGatePilotStatus("APPROVED");
                    }}
                  >
                    确认试测
                  </button>
                  <button
                    type="button"
                    disabled={
                      action.isPending ||
                      version.status !== "VALIDATED" ||
                      version.contentReviewStatus !== "APPROVED" ||
                      version.angoffStatus !== "APPROVED" ||
                      version.pilotStatus !== "APPROVED" ||
                      version.sourceReviewStatus !== "CURRENT"
                    }
                    onClick={() => {
                      action.reset();
                      setConfirmingAction({
                        type: "publish",
                        id: version.id,
                        target: version,
                      });
                    }}
                  >
                    发布
                  </button>
                  <button
                    type="button"
                    disabled={
                      action.isPending || version.status !== "PUBLISHED"
                    }
                    onClick={() => {
                      action.reset();
                      setConfirmingAction({
                        type: "retire",
                        id: version.id,
                        target: version,
                      });
                    }}
                  >
                    停用
                  </button>
                </div>
                {gateVersion === version.id && (
                  <form
                    className="assessment-gate-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      action.mutate({ type: "gates", id: version.id });
                    }}
                  >
                    <label>
                      审核记录引用
                      <input
                        required
                        minLength={10}
                        value={reviewReference}
                        onChange={(event) =>
                          setReviewReference(event.target.value)
                        }
                        placeholder="飞书文档链接、评审单号或会议纪要编号"
                      />
                    </label>
                    <label>
                      通过线
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={passScore}
                        onChange={(event) =>
                          setPassScore(Number(event.target.value))
                        }
                      />
                    </label>
                    <p>
                      <ShieldCheck aria-hidden="true" />
                      {gatePilotStatus === "APPROVED"
                        ? "提交表示已核对受控试测完成记录及其评审结论。"
                        : "提交表示内容审核、Angoff 定标与证据时效均已由负责人确认；试测仍需单独完成。"}
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={() => setGateVersion(null)}
                      >
                        取消
                      </button>
                      <button
                        className="assessment-primary"
                        type="submit"
                        disabled={
                          action.isPending || reviewReference.length < 10
                        }
                      >
                        保存人工门禁
                      </button>
                    </div>
                  </form>
                )}
              </article>
            ))}
          </div>
          {pilotVersion && (
            <section
              className="assessment-quality-panel"
              aria-labelledby="pilot-title"
            >
              <header>
                <div>
                  <span className="eyebrow">Controlled pilot · 受控试测</span>
                  <h3 id="pilot-title">
                    {pilotVersion.title} · {pilotVersion.version}
                  </h3>
                </div>
                <button type="button" onClick={() => setPilotVersion(null)}>
                  关闭
                </button>
              </header>
              <p>
                仅授权名单中的在职员工可答未发布版本；试测不计入正式认证次数。
              </p>
              <label>
                搜索并授权员工
                <input
                  value={pilotQuery}
                  onChange={(event) => setPilotQuery(event.target.value)}
                  placeholder="输入姓名"
                />
              </label>
              {pilotCandidates.data?.items.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  disabled={action.isPending}
                  onClick={() =>
                    action.mutate({
                      type: "grant-pilot",
                      id: pilotVersion.id,
                      userId: employee.id,
                    })
                  }
                >
                  授权 {employee.displayName}
                </button>
              ))}
              {pilotParticipants.isError && (
                <p className="assessment-error" role="alert">
                  {pilotParticipants.error.message}
                </p>
              )}
              {action.isError && (
                <p className="assessment-error" role="alert">
                  {action.error.message}
                </p>
              )}
              <ul className="assessment-pilot-list">
                {pilotParticipants.data?.map((participant) => (
                  <li key={participant.userId}>
                    <span>
                      <strong>{participant.displayName}</strong>
                      <small>
                        {participant.revokedAt
                          ? "已撤销"
                          : (participant.attemptStatus ?? "等待开始")}
                      </small>
                    </span>
                    {!participant.revokedAt && (
                      <button
                        type="button"
                        disabled={action.isPending}
                        onClick={() =>
                          action.mutate({
                            type: "revoke-pilot",
                            id: pilotVersion.id,
                            userId: participant.userId,
                          })
                        }
                      >
                        撤销
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {qualityVersion && (
            <section
              className="assessment-quality-panel"
              aria-labelledby="quality-title"
            >
              <header>
                <div>
                  <span className="eyebrow">Item analysis · 题目质量</span>
                  <h3 id="quality-title">首考样本分析</h3>
                </div>
                <button type="button" onClick={() => setQualityVersion(null)}>
                  关闭
                </button>
              </header>
              {quality.isPending && <p>正在计算首考题目质量…</p>}
              {quality.isError && (
                <p className="assessment-error">{quality.error.message}</p>
              )}
              {quality.data && (
                <>
                  <p>
                    题库 {quality.data.version} · 有效首考样本{" "}
                    {quality.data.firstAttemptSampleSize} 份。区分度在样本达到
                    30 后计算，并使用扣除本题后的总分校正。
                  </p>
                  <div className="assessment-admin-table-wrap">
                    <table className="assessment-admin-table assessment-quality-table">
                      <thead>
                        <tr>
                          <th>题号</th>
                          <th>正确率</th>
                          <th>未答</th>
                          <th>中位用时</th>
                          <th>P90 用时</th>
                          <th>快速作答</th>
                          <th>修改</th>
                          <th>校正区分度</th>
                          <th>选项分布</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quality.data.items.map((item) => (
                          <tr key={item.questionId}>
                            <td>{item.stableKey}</td>
                            <td>
                              {Math.round(item.accuracy * 100)}%
                              <small>
                                {item.correct}/{item.sampleSize}
                              </small>
                            </td>
                            <td>{item.unanswered}</td>
                            <td>{formatDuration(item.medianDurationMs)}</td>
                            <td>{formatDuration(item.p90DurationMs)}</td>
                            <td>{item.rapidAnswerCount}</td>
                            <td>{item.changedAnswerCount}</td>
                            <td title={item.note ?? undefined}>
                              {item.pointBiserial === null
                                ? "样本不足"
                                : item.pointBiserial.toFixed(2)}
                            </td>
                            <td>
                              A {item.optionCounts.a ?? 0} · B{" "}
                              {item.optionCounts.b ?? 0} · C{" "}
                              {item.optionCounts.c ?? 0} · D{" "}
                              {item.optionCounts.d ?? 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}
        </section>

        <section
          className="assessment-admin-section"
          aria-labelledby="attempt-title"
        >
          <div className="assessment-admin-section-title">
            <Flag aria-hidden="true" />
            <div>
              <h2 id="attempt-title">最近测评记录</h2>
              <p>
                最多展示最近 200 条。管理员查看报告和作废操作都会写入审计日志。
              </p>
            </div>
          </div>
          {attempts.isPending && <p>正在读取测评记录…</p>}
          {attempts.isError && (
            <p className="assessment-error">{attempts.error.message}</p>
          )}
          {attempts.data?.length === 0 ? (
            <p className="assessment-admin-empty">
              暂无测评记录。员工提交答卷后会在这里显示。
            </p>
          ) : (
            <div className="assessment-admin-table-wrap">
              <table className="assessment-admin-table">
                <thead>
                  <tr>
                    <th>员工</th>
                    <th>测评</th>
                    <th>类别</th>
                    <th>次数</th>
                    <th>状态</th>
                    <th>本次</th>
                    <th>首考</th>
                    <th>最高</th>
                    <th>通过</th>
                    <th>开始时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.data?.map((attempt) => (
                    <tr key={attempt.id}>
                      <td>{attempt.employee}</td>
                      <td>
                        {attempt.assessment}
                        <small>{attempt.version}</small>
                      </td>
                      <td>{attempt.kind === "PILOT" ? "试测" : "正式"}</td>
                      <td>第 {attempt.attemptNumber} 次</td>
                      <td>{statusLabels[attempt.status]}</td>
                      <td>{attempt.score ?? "待评分"}</td>
                      <td>{attempt.firstScore ?? "暂无"}</td>
                      <td>{attempt.bestScore ?? "暂无"}</td>
                      <td>{attempt.passed ? "是" : "否"}</td>
                      <td>
                        {new Date(attempt.startedAt).toLocaleString("zh-CN")}
                      </td>
                      <td>
                        <button
                          type="button"
                          disabled={attempt.status === "IN_PROGRESS"}
                          aria-label={`查看 ${attempt.employee} 第 ${attempt.attemptNumber} 次测评报告`}
                          onClick={() => setReportAttempt(attempt)}
                        >
                          查看报告
                        </button>
                        <button
                          type="button"
                          disabled={
                            action.isPending || attempt.status === "VOIDED"
                          }
                          aria-label={`作废 ${attempt.employee} 第 ${attempt.attemptNumber} 次测评`}
                          onClick={() => {
                            action.reset();
                            setVoidReason("");
                            setVoidCode("TECHNICAL");
                            setVoiding(attempt);
                          }}
                        >
                          作废
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {confirmingAction && (
          <AssessmentDialog>
            <section
              className="assessment-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-action-confirm-title"
              ref={actionDialogRef}
              onKeyDown={onActionDialogKeyDown}
            >
              <ShieldCheck aria-hidden="true" />
              <h2 id="admin-action-confirm-title">
                {confirmingAction.type === "publish"
                  ? "发布题库版本？"
                  : "停用题库版本？"}
              </h2>
              <p>
                {confirmingAction.type === "publish"
                  ? "发布后，当前已发布版本会自动停用，新的测评将使用此版本。"
                  : "停用后，员工无法开始新的测评，已完成记录仍会保留。"}
              </p>
              <p className="assessment-notice">
                目标：{confirmingAction.target.title} · 周期{" "}
                {confirmingAction.target.cycleKey} · 版本{" "}
                {confirmingAction.target.version}
              </p>
              {action.isError && (
                <p className="assessment-error" role="alert">
                  {action.error.message}
                </p>
              )}
              <div>
                <button
                  type="button"
                  disabled={action.isPending}
                  onClick={closeActionDialog}
                >
                  取消
                </button>
                <button
                  className="assessment-primary"
                  type="button"
                  data-dialog-initial-focus
                  disabled={action.isPending}
                  onClick={() => action.mutate(confirmingAction)}
                >
                  {action.isPending
                    ? "正在处理…"
                    : confirmingAction.type === "publish"
                      ? "确认发布"
                      : "确认停用"}
                </button>
              </div>
            </section>
          </AssessmentDialog>
        )}
        {voiding && (
          <AssessmentDialog>
            <form
              className="assessment-dialog assessment-admin-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="void-title"
              ref={voidDialogRef}
              onKeyDown={onVoidDialogKeyDown}
              onSubmit={(event) => {
                event.preventDefault();
                action.mutate({ type: "void", id: voiding.id });
              }}
            >
              <Flag aria-hidden="true" />
              <h2 id="void-title">作废测评记录</h2>
              <p>
                作废后该次记录保留在审计历史中，并释放测评次数。请填写可追溯原因。
              </p>
              <p className="assessment-notice">
                目标：{voiding.employee} · {voiding.assessment} · 版本{" "}
                {voiding.version} · 第 {voiding.attemptNumber} 次 ·{" "}
                {voiding.score ?? "待评分"} 分
              </p>
              <label>
                原因类型
                <select
                  value={voidCode}
                  onChange={(event) =>
                    setVoidCode(event.target.value as typeof voidCode)
                  }
                >
                  <option value="TECHNICAL">技术故障</option>
                  <option value="CONTENT_ERROR">题目错误</option>
                  <option value="SECURITY">安全事件</option>
                  <option value="OTHER">其他</option>
                </select>
              </label>
              <label>
                详细原因
                <textarea
                  required
                  minLength={10}
                  rows={4}
                  maxLength={500}
                  data-dialog-initial-focus
                  value={voidReason}
                  onChange={(event) => setVoidReason(event.target.value)}
                />
              </label>
              <div>
                <button type="button" onClick={closeVoidDialog}>
                  取消
                </button>
                <button
                  className="assessment-primary"
                  type="submit"
                  disabled={action.isPending || voidReason.length < 10}
                >
                  确认作废
                </button>
              </div>
            </form>
          </AssessmentDialog>
        )}
        {reportAttempt && (
          <AssessmentDialog>
            <section
              className="assessment-dialog assessment-admin-report-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-report-title"
              ref={reportDialogRef}
              onKeyDown={onReportDialogKeyDown}
            >
              <Eye aria-hidden="true" />
              <h2 id="admin-report-title">个人报告审计预览</h2>
              <p>本次查看已经写入审计日志，仅用于培训辅导与故障处理。</p>
              <p className="assessment-notice">
                目标：{reportAttempt.employee} · {reportAttempt.assessment} ·
                版本 {reportAttempt.version} · 第 {reportAttempt.attemptNumber}{" "}
                次
              </p>
              {report.isPending && <p>正在读取报告…</p>}
              {report.isError && (
                <p className="assessment-error">{report.error.message}</p>
              )}
              {report.data?.payload && (
                <div className="assessment-admin-report-body">
                  <div className="assessment-admin-report-score">
                    <strong>{report.data.payload.score}</strong>
                    <span>
                      分 · {report.data.payload.passed ? "已通过" : "待巩固"}
                    </span>
                  </div>
                  <div>
                    <h3>
                      <Activity aria-hidden="true" />
                      五维表现
                    </h3>
                    {report.data.payload.dimensions.map((item) => (
                      <p key={item.key}>
                        <span>{item.label}</span>
                        <strong>{Math.round(item.accuracy * 100)}%</strong>
                      </p>
                    ))}
                  </div>
                  <div>
                    <h3>优先建议</h3>
                    {report.data.payload.recommendations.length ? (
                      report.data.payload.recommendations.map((item) => (
                        <p key={item.priority}>
                          <span>
                            P{item.priority} {item.title}
                          </span>
                          <small>{item.reason}</small>
                        </p>
                      ))
                    ) : (
                      <p>没有达到重复误区阈值的建议。</p>
                    )}
                  </div>
                </div>
              )}
              {report.data && !report.data.payload && (
                <p className="assessment-notice">
                  报告明细当前不可用：
                  {report.data.failureCode ?? report.data.status}
                </p>
              )}
              <div>
                <button
                  type="button"
                  data-dialog-initial-focus
                  onClick={() => setReportAttempt(null)}
                >
                  关闭
                </button>
              </div>
            </section>
          </AssessmentDialog>
        )}
        {action.isError && (
          <p className="assessment-error assessment-admin-error" role="alert">
            {action.error.message}
          </p>
        )}
        {action.isSuccess && (
          <p className="assessment-success assessment-admin-error">
            <CheckCircle2 aria-hidden="true" />
            操作已完成。
          </p>
        )}
      </main>
    </div>
  );
}
