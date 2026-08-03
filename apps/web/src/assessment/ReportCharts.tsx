import type { ReactElement, ReactNode } from "react";
import type { AssessmentReportPayload } from "@orosaga/contracts";
import {
  formatDuration,
  internalLearningPath,
  learningPathLabel,
  questionOptionLabel,
} from "./assessment-utils";
import { QuestionResultMap } from "./QuestionResultMap";

type Aggregate = AssessmentReportPayload["dimensions"][number];
type DataRow = { label: string; value: string };
type ChartCardProps = {
  id: string;
  index: number;
  title: string;
  note: string;
  children: ReactNode;
  rows: DataRow[];
};

function ChartCard({ id, index, title, note, children, rows }: ChartCardProps) {
  return (
    <figure className="assessment-chart-card" data-chart-id={id}>
      <figcaption>
        <span>{String(index).padStart(2, "0")}</span>
        <div>
          <h3>{title}</h3>
          <p>{note}</p>
        </div>
      </figcaption>
      <div className="assessment-chart-visual">{children}</div>
      <details className="assessment-chart-data">
        <summary>查看图表数据</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">项目</th>
              <th scope="col">数据</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.label}-${row.value}`}>
                <th scope="row">{row.label}</th>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function AggregateBars({ values }: { values: Aggregate[] }) {
  return (
    <div
      className="assessment-bars"
      role="img"
      aria-label={values
        .map((item) => `${item.label} ${Math.round(item.accuracy * 100)}%`)
        .join("，")}
    >
      {values.map((item) => (
        <div className="assessment-bar-row" key={item.key}>
          <span>{item.label}</span>
          <i>
            <b style={{ width: `${Math.round(item.accuracy * 100)}%` }} />
          </i>
          <strong>{Math.round(item.accuracy * 100)}%</strong>
        </div>
      ))}
    </div>
  );
}

function CountBars({
  values,
}: {
  values: Array<{ label: string; count: number }>;
}) {
  const max = Math.max(1, ...values.map((item) => item.count));
  return (
    <div
      className="assessment-bars"
      role="img"
      aria-label={values
        .map((item) => `${item.label} ${item.count} 题`)
        .join("，")}
    >
      {values.map((item) => (
        <div className="assessment-bar-row" key={item.label}>
          <span>{item.label}</span>
          <i>
            <b style={{ width: `${(item.count / max) * 100}%` }} />
          </i>
          <strong>{item.count}题</strong>
        </div>
      ))}
    </div>
  );
}

const aggregateRows = (items: Aggregate[]): DataRow[] =>
  items.map((item) => ({
    label: item.label,
    value: `${item.correct}/${item.total}，${Math.round(item.accuracy * 100)}%${item.note ? `；${item.note}` : ""}`,
  }));

function ResultDonut({ payload }: { payload: AssessmentReportPayload }) {
  const { correct, incorrect, unanswered } = payload.resultCounts;
  const total = Math.max(1, correct + incorrect + unanswered);
  const correctLength = (correct / total) * 100;
  const incorrectLength = (incorrect / total) * 100;
  return (
    <div className="assessment-donut-wrap">
      <svg
        viewBox="0 0 42 42"
        role="img"
        aria-label={`正确 ${correct} 题，错误 ${incorrect} 题，未答 ${unanswered} 题`}
      >
        <circle className="donut-base" cx="21" cy="21" r="15.9155" />
        <circle
          className="donut-correct"
          cx="21"
          cy="21"
          r="15.9155"
          strokeDasharray={`${correctLength} ${100 - correctLength}`}
        />
        <circle
          className="donut-incorrect"
          cx="21"
          cy="21"
          r="15.9155"
          strokeDasharray={`${incorrectLength} ${100 - incorrectLength}`}
          strokeDashoffset={-correctLength}
        />
      </svg>
      <div>
        <strong>{payload.score}</strong>
        <span>总分</span>
      </div>
      <ul>
        <li>
          <i className="correct" />
          正确 {correct}
        </li>
        <li>
          <i className="incorrect" />
          错误 {incorrect}
        </li>
        <li>
          <i className="unanswered" />
          未答 {unanswered}
        </li>
      </ul>
    </div>
  );
}

function DistributionBars({
  rows,
}: {
  rows: Array<{ label: string; count: number }>;
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <div
      className="assessment-distribution"
      role="img"
      aria-label={rows.map((row) => `${row.label} ${row.count} 题`).join("，")}
    >
      {rows.map((row) => (
        <div key={row.label}>
          <strong>{row.count}</strong>
          <i>
            <b
              style={{
                height: `${row.count === 0 ? 0 : Math.max(4, (row.count / max) * 100)}%`,
              }}
            />
          </i>
          <span>{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function ScatterChart({
  payload,
  importance = false,
}: {
  payload: AssessmentReportPayload;
  importance?: boolean;
}) {
  if (importance) {
    const rows = [1, 2, 3, 4, 5].map((level) => {
      const questions = payload.questionResults.filter(
        (item) => item.businessImportance === level,
      );
      return {
        level,
        errors: questions.filter((item) => !item.correct).length,
        total: questions.length,
      };
    });
    const maxErrors = Math.max(1, ...rows.map((row) => row.errors));
    return (
      <svg
        className="assessment-scatter"
        viewBox="0 0 520 220"
        role="img"
        aria-label="业务重要度与错误数量散点图"
      >
        <path d="M48 18V184H500" />
        <text x="12" y="24">
          错误
        </text>
        <text x="430" y="214">
          重要度
        </text>
        {rows.map((row) => (
          <g key={row.level}>
            <circle
              cx={48 + row.level * 82}
              cy={184 - (row.errors / maxErrors) * 145}
              r={7 + row.total * 0.8}
            />
            <text x={43 + row.level * 82} y="204">
              {row.level}
            </text>
            <text
              x={55 + row.level * 82}
              y={178 - (row.errors / maxErrors) * 145}
            >
              {row.errors}
            </text>
          </g>
        ))}
      </svg>
    );
  }
  const maxTime = Math.max(
    1,
    ...payload.timing.items.map((item) => item.durationMs),
  );
  return (
    <svg
      className="assessment-scatter"
      viewBox="0 0 520 220"
      role="img"
      aria-label="答题时间与正确性分布图"
    >
      <path d="M48 18V184H500" />
      <line x1="48" y1="100" x2="500" y2="100" />
      <text x="10" y="52">
        正确
      </text>
      <text x="10" y="154">
        错误
      </text>
      <text x="424" y="214">
        答题时间
      </text>
      {payload.timing.items.map((item, index) => (
        <circle
          className={item.correct ? "is-correct" : "is-incorrect"}
          cx={55 + (item.durationMs / maxTime) * 435}
          cy={(item.correct ? 54 : 146) + ((index % 5) - 2) * 5}
          r="5"
          key={item.questionKey}
        >
          <title>
            {item.questionKey}，{formatDuration(item.durationMs)}，
            {item.correct ? "正确" : "错误"}
          </title>
        </circle>
      ))}
    </svg>
  );
}

function HistoryLine({ payload }: { payload: AssessmentReportPayload }) {
  const points = payload.history;
  return (
    <svg
      className="assessment-history-chart"
      viewBox="0 0 520 220"
      role="img"
      aria-label={points
        .map((point) => `第 ${point.attemptNumber} 次 ${point.score} 分`)
        .join("，")}
    >
      <path d="M48 18V184H500" />
      <polyline
        points={points
          .map(
            (point, index) =>
              `${65 + index * (420 / Math.max(1, points.length - 1))},${184 - point.score * 1.55}`,
          )
          .join(" ")}
      />
      {points.map((point, index) => (
        <g key={point.attemptNumber}>
          <circle
            cx={65 + index * (420 / Math.max(1, points.length - 1))}
            cy={184 - point.score * 1.55}
            r="6"
          />
          <text
            x={55 + index * (420 / Math.max(1, points.length - 1))}
            y={170 - point.score * 1.55}
          >
            {point.score}
          </text>
          <text x={52 + index * (420 / Math.max(1, points.length - 1))} y="205">
            第{point.attemptNumber}次
          </text>
        </g>
      ))}
    </svg>
  );
}

export function ReportCharts({
  payload,
}: {
  payload: AssessmentReportPayload;
}) {
  const timingBuckets = [
    {
      label: "少于15秒",
      count: payload.timing.items.filter((item) => item.durationMs < 15_000)
        .length,
    },
    {
      label: "15至30秒",
      count: payload.timing.items.filter(
        (item) => item.durationMs >= 15_000 && item.durationMs < 30_000,
      ).length,
    },
    {
      label: "30至60秒",
      count: payload.timing.items.filter(
        (item) => item.durationMs >= 30_000 && item.durationMs < 60_000,
      ).length,
    },
    {
      label: "60秒以上",
      count: payload.timing.items.filter((item) => item.durationMs >= 60_000)
        .length,
    },
  ];
  const changeBuckets = [
    {
      label: "未修改",
      count: payload.questionResults.filter((item) => item.changeCount === 0)
        .length,
    },
    {
      label: "修改1次",
      count: payload.questionResults.filter((item) => item.changeCount === 1)
        .length,
    },
    {
      label: "修改2次",
      count: payload.questionResults.filter((item) => item.changeCount === 2)
        .length,
    },
    {
      label: "修改3次以上",
      count: payload.questionResults.filter((item) => item.changeCount >= 3)
        .length,
    },
  ];
  const importanceRows = [1, 2, 3, 4, 5].map((level) => {
    const items = payload.questionResults.filter(
      (item) => item.businessImportance === level,
    );
    return {
      label: `重要度 ${level}`,
      value: `${items.filter((item) => !item.correct).length}/${items.length} 题错误`,
    };
  });
  const learningPaths = [
    ...new Set(payload.recommendations.flatMap((item) => item.learningPaths)),
  ];
  const charts: ReactElement<ChartCardProps>[] = [
    <ChartCard
      id="result"
      index={1}
      title="总分与答题结果"
      note="首先看整体掌握程度与漏答情况。"
      rows={[
        { label: "正确", value: `${payload.resultCounts.correct} 题` },
        { label: "错误", value: `${payload.resultCounts.incorrect} 题` },
        { label: "未答", value: `${payload.resultCounts.unanswered} 题` },
      ]}
    >
      <ResultDonut payload={payload} />
    </ChartCard>,
    <ChartCard
      id="dimensions"
      index={2}
      title="五维能力画像"
      note="定位能力结构中的优势与优先补强项。"
      rows={aggregateRows(payload.dimensions)}
    >
      <AggregateBars values={payload.dimensions} />
    </ChartCard>,
    <ChartCard
      id="sources"
      index={3}
      title="证据来源表现"
      note="比较论文、数据与业务场景的理解差异。"
      rows={aggregateRows(payload.sources)}
    >
      <AggregateBars values={payload.sources} />
    </ChartCard>,
    <ChartCard
      id="difficulty"
      index={4}
      title="难度梯度表现"
      note="观察识别、应用与综合判断的稳定性。"
      rows={aggregateRows(payload.difficulties)}
    >
      <AggregateBars values={payload.difficulties} />
    </ChartCard>,
    <ChartCard
      id="topics"
      index={5}
      title="主题掌握度"
      note="按知识主题拆分正确率。"
      rows={aggregateRows(payload.topics)}
    >
      <AggregateBars values={payload.topics} />
    </ChartCard>,
    <ChartCard
      id="stages"
      index={6}
      title="交付阶段掌握度"
      note="对应诊断、策略、执行与复盘等工作阶段。"
      rows={aggregateRows(payload.stages)}
    >
      <AggregateBars values={payload.stages} />
    </ChartCard>,
    <ChartCard
      id="misconceptions"
      index={7}
      title="高频认知误区"
      note="同类误区重复出现时，建议优先建立统一判断口径。"
      rows={
        payload.misconceptions.length
          ? payload.misconceptions.map((item) => ({
              label: item.label,
              value: `${item.count} 题`,
            }))
          : [{ label: "认知误区", value: "本次未形成可归类的认知误区" }]
      }
    >
      {payload.misconceptions.length ? (
        <CountBars values={payload.misconceptions.slice(0, 8)} />
      ) : (
        <p className="assessment-chart-empty">本次未形成可归类的认知误区</p>
      )}
    </ChartCard>,
    <ChartCard
      id="timing"
      index={8}
      title="答题用时分布"
      note={`平均每题 ${formatDuration(payload.timing.averageDurationMs)}。`}
      rows={timingBuckets.map((item) => ({
        label: item.label,
        value: `${item.count} 题`,
      }))}
    >
      <DistributionBars rows={timingBuckets} />
    </ChartCard>,
    <ChartCard
      id="changes"
      index={9}
      title="答案修改分布"
      note="帮助识别判断犹豫与反复修改的范围。"
      rows={changeBuckets.map((item) => ({
        label: item.label,
        value: `${item.count} 题`,
      }))}
    >
      <DistributionBars rows={changeBuckets} />
    </ChartCard>,
    <ChartCard
      id="correctness-time"
      index={10}
      title="正确性与用时"
      note="右侧代表用时较长，可结合正确性复盘判断过程。"
      rows={payload.timing.items.map((item) => ({
        label: item.questionKey,
        value: `${formatDuration(item.durationMs)}，${item.correct ? "正确" : "错误"}`,
      }))}
    >
      <ScatterChart payload={payload} />
    </ChartCard>,
    <ChartCard
      id="importance-errors"
      index={11}
      title="业务重要度与错误"
      note="高重要度题目的错误会进入更高优先级的复盘，圆点大小表示题量。"
      rows={importanceRows}
    >
      <ScatterChart payload={payload} importance />
    </ChartCard>,
    <ChartCard
      id="priority"
      index={12}
      title="改进优先级"
      note="优先级由重复误区、涉及题目与业务重要度共同生成。"
      rows={payload.recommendations.map((item) => ({
        label: `P${item.priority} ${item.title}`,
        value: `${item.evidence.length} 项证据`,
      }))}
    >
      <ol className="assessment-priority-chart">
        {payload.recommendations.length ? (
          payload.recommendations.map((item) => (
            <li key={item.priority}>
              <span>P{item.priority}</span>
              <strong>{item.title}</strong>
              <small>{item.evidence.join("、")}</small>
            </li>
          ))
        ) : (
          <li className="is-empty">当前没有达到重复误区阈值的改进项</li>
        )}
      </ol>
    </ChartCard>,
    <ChartCard
      id="learning-route"
      index={13}
      title="建议学习路线"
      note="按诊断建议中引用的学习路径组织复习顺序。"
      rows={learningPaths.map((path, index) => ({
        label: `步骤 ${index + 1}`,
        value: learningPathLabel(path),
      }))}
    >
      <ol className="assessment-learning-route">
        {learningPaths.length ? (
          learningPaths.map((path, index) => {
            const href = internalLearningPath(path);
            const label = learningPathLabel(path);
            return (
              <li key={path}>
                <span>{index + 1}</span>
                {href ? <a href={href}>{label}</a> : <strong>{label}</strong>}
              </li>
            );
          })
        ) : (
          <li className="is-empty">当前没有需要追加的学习路径</li>
        )}
      </ol>
    </ChartCard>,
    <ChartCard
      id="item-map"
      index={14}
      title={`${payload.questionResults.length} 题结果地图`}
      note="点击任意题号查看题目、选项、你的答案、标准答案与完整解析。绿色为正确，红色为错误，灰色为未作答。"
      rows={payload.questionResults.map((item) => ({
        label: `第 ${item.position} 题`,
        value: `${questionOptionLabel(item, item.selectedOptionId)}/${questionOptionLabel(item, item.correctOptionId)}，${item.correct ? "正确" : item.selectedOptionId ? "错误" : "未作答"}`,
      }))}
    >
      <QuestionResultMap questions={payload.questionResults} />
    </ChartCard>,
  ];
  if (payload.history.length > 1) {
    charts.push(
      <ChartCard
        id="score-history"
        index={15}
        title="历次分数趋势"
        note="对比同一测评周期内的多次结果。"
        rows={payload.history.map((item) => ({
          label: `第 ${item.attemptNumber} 次`,
          value: `${item.score} 分`,
        }))}
      >
        <HistoryLine payload={payload} />
      </ChartCard>,
    );
  }
  const dimensionHistory = payload.history.filter(
    (item) => Object.keys(item.dimensionScores).length > 0,
  );
  if (dimensionHistory.length > 1) {
    const firstDimensions = dimensionHistory[0]?.dimensionScores ?? {};
    const latestDimensions = dimensionHistory.at(-1)?.dimensionScores ?? {};
    const dimensionLabelByKey = Object.fromEntries(
      payload.dimensions.map((item) => [item.key, item.label]),
    );
    charts.push(
      <ChartCard
        id="dimension-change"
        index={16}
        title="能力维度变化"
        note="比较首次与本次五个维度的分数变化。"
        rows={Object.keys(latestDimensions).map((key) => ({
          label: dimensionLabelByKey[key] ?? key,
          value: `${firstDimensions[key] ?? 0} → ${latestDimensions[key] ?? 0}`,
        }))}
      >
        <div className="assessment-dimension-change">
          <div className="assessment-dimension-change-legend">
            <span>
              <em className="is-first" />
              首次
            </span>
            <span>
              <em className="is-latest" />
              本次
            </span>
          </div>
          {Object.keys(latestDimensions).map((key) => {
            const first = firstDimensions[key] ?? 0;
            const latest = latestDimensions[key] ?? 0;
            return (
              <div key={key}>
                <strong>{dimensionLabelByKey[key] ?? key}</strong>
                <i>
                  <b className="is-first" style={{ width: `${first}%` }} />
                  <b className="is-latest" style={{ width: `${latest}%` }} />
                </i>
                <span>
                  {first} → {latest}
                </span>
              </div>
            );
          })}
        </div>
      </ChartCard>,
    );
  }
  return (
    <div className="assessment-chart-grid">
      {charts.map((chart) => (
        <div
          className={
            chart.props.id === "item-map" ? "assessment-chart-wide" : undefined
          }
          data-chart-wrapper={chart.props.id}
          key={chart.props.id}
        >
          {chart}
        </div>
      ))}
    </div>
  );
}
