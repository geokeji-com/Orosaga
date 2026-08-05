// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { AssessmentReportPayload } from "@orosaga/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { ReportCharts } from "./ReportCharts";
import { reportChartCount } from "./report-chart-count";

const aggregate = (key: string, label: string) => ({
  key,
  label,
  correct: 1,
  total: 2,
  accuracy: 0.5,
});

const payload: AssessmentReportPayload = {
  reportVersion: "1.0.0",
  generatedAt: "2026-08-03T01:30:01.000Z",
  score: 50,
  passScore: 80,
  passed: false,
  resultCounts: { correct: 1, incorrect: 1, unanswered: 0 },
  dimensions: [aggregate("D1", "概念与数据边界")],
  sources: [aggregate("PAPER", "论文证据")],
  difficulties: [aggregate("L2", "场景应用")],
  topics: [aggregate("DATA_BOUNDARY", "数据边界")],
  stages: [aggregate("diagnosis", "诊断")],
  misconceptions: [
    {
      code: "M-DATA-OVERREACH",
      label: "数据边界外推",
      count: 2,
      questionKeys: ["GEO-001", "GEO-002"],
    },
  ],
  timing: {
    totalDurationMs: 42_000,
    averageDurationMs: 21_000,
    items: [
      {
        questionKey: "GEO-001",
        durationMs: 18_000,
        correct: true,
        difficulty: "L2",
      },
      {
        questionKey: "GEO-002",
        durationMs: 24_000,
        correct: false,
        difficulty: "L2",
      },
    ],
  },
  recommendations: [
    {
      priority: 1,
      title: "校准数据边界",
      reason: "两道题呈现同类误区。",
      evidence: ["GEO-001", "GEO-002"],
      learningPaths: ["/workflow"],
      practice: "复算案例。",
      completionCriteria: "复核通过。",
    },
  ],
  questionResults: [
    {
      questionId: "91f38ef0-76d1-430a-93ee-2e65321a1a22",
      stableKey: "GEO-001",
      position: 1,
      primaryDimension: "D1",
      difficulty: "L2",
      businessImportance: 5,
      stem: "应优先确认哪项数据边界？",
      options: [
        {
          id: "a",
          text: "样本范围",
          rationale: "正确。",
          selected: true,
          correct: true,
        },
        {
          id: "b",
          text: "页面颜色",
          rationale: "无关。",
          selected: false,
          correct: false,
        },
        {
          id: "c",
          text: "文件名称",
          rationale: "无关。",
          selected: false,
          correct: false,
        },
        {
          id: "d",
          text: "汇报日期",
          rationale: "无关。",
          selected: false,
          correct: false,
        },
      ],
      selectedOptionId: "a",
      correctOptionId: "a",
      correct: true,
      coreRationale: "依据字段判断。",
      reasoningSteps: ["核对字段", "核对分母"],
      businessApplication: "用于客户结论复核。",
      sourceIds: ["P01"],
      learningPaths: ["/workflow"],
      misconceptionCode: null,
      activeDurationMs: 18_000,
      changeCount: 0,
    },
  ],
  history: [
    {
      attemptNumber: 1,
      score: 50,
      submittedAt: "2026-08-03T01:30:00.000Z",
      dimensionScores: { D1: 50 },
    },
  ],
};

afterEach(cleanup);

describe("assessment report charts", () => {
  it("renders 14 evidence-backed charts with readable data tables", () => {
    const { container } = render(<ReportCharts payload={payload} />);
    const charts = container.querySelectorAll("figure[data-chart-id]");
    expect(charts).toHaveLength(14);
    expect(container.querySelectorAll("figure figcaption")).toHaveLength(14);
    expect(container.querySelectorAll("figure details table")).toHaveLength(14);
    expect(container.textContent).toContain("业务重要度与错误");
    expect(container.textContent).toContain("数据边界外推");
    expect(
      container.querySelector('[data-chart-id="learning-route"]'),
    ).toHaveTextContent("GEO 工作流");
    expect(
      container.querySelector(
        '[data-chart-id="learning-route"] a[href="/workflow"]',
      ),
    ).toBeInTheDocument();
  });

  it("adds two trend charts when multiple attempts exist", () => {
    const historyPayload: AssessmentReportPayload = {
      ...payload,
      history: [
        ...payload.history,
        {
          attemptNumber: 2,
          score: 76,
          submittedAt: "2026-08-04T01:30:00.000Z",
          dimensionScores: { D1: 76 },
        },
      ],
    };
    const { container } = render(<ReportCharts payload={historyPayload} />);
    expect(container.querySelectorAll("figure[data-chart-id]")).toHaveLength(
      16,
    );
    expect(
      container.querySelector('[data-chart-id="score-history"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-chart-id="dimension-change"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-chart-id="dimension-change"]'),
    ).toHaveTextContent("概念与数据边界");
    expect(
      container.querySelector('[data-chart-id="dimension-change"]'),
    ).toHaveTextContent("首次本次");
    expect(reportChartCount(historyPayload)).toBe(16);
  });

  it("opens complete details from correct and incorrect result-map items", () => {
    const correctQuestion = payload.questionResults[0]!;
    const incorrectQuestion: (typeof payload.questionResults)[number] = {
      ...correctQuestion,
      questionId: "91f38ef0-76d1-430a-93ee-2e65321a1a23",
      stableKey: "GEO-002",
      position: 2,
      stem: "哪项做法会让数据结论失去证据边界？",
      options: [
        correctQuestion.options[1]!,
        correctQuestion.options[0]!,
        correctQuestion.options[2]!,
        correctQuestion.options[3]!,
      ].map((option) => ({ ...option, selected: option.id === "b" })),
      selectedOptionId: "b",
      correct: false,
      misconceptionCode: "M-DATA-OVERREACH",
    };
    const unansweredQuestion: (typeof payload.questionResults)[number] = {
      ...correctQuestion,
      questionId: "91f38ef0-76d1-430a-93ee-2e65321a1a24",
      stableKey: "GEO-003",
      position: 3,
      stem: "未作答时结果地图应如何呈现？",
      options: correctQuestion.options.map((option) => ({
        ...option,
        selected: false,
      })),
      selectedOptionId: null,
      correct: false,
      misconceptionCode: null,
    };
    render(
      <ReportCharts
        payload={{
          ...payload,
          questionResults: [
            correctQuestion,
            incorrectQuestion,
            unansweredQuestion,
          ],
        }}
      />,
    );

    const correctButton = screen.getByRole("button", {
      name: /第 1 题，回答正确/,
    });
    correctButton.focus();
    fireEvent.click(correctButton);
    let dialog = screen.getByRole("dialog", { name: correctQuestion.stem });
    expect(
      dialog.querySelectorAll(".assessment-question-detail-options > li"),
    ).toHaveLength(4);
    expect(dialog).toHaveTextContent("你的答案1");
    expect(dialog).toHaveTextContent("标准答案1");
    expect(dialog).toHaveTextContent("依据字段判断");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "关闭题目详情" }),
    );
    expect(correctButton).toHaveFocus();

    const incorrectButton = screen.getByRole("button", {
      name: /第 2 题，回答错误/,
    });
    fireEvent.click(incorrectButton);
    dialog = screen.getByRole("dialog", { name: incorrectQuestion.stem });
    expect(dialog).toHaveTextContent("你的答案1");
    expect(dialog).toHaveTextContent("标准答案2");
    expect(dialog).toHaveTextContent("页面颜色");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "关闭题目详情" }),
    );

    const unansweredButton = screen.getByRole("button", {
      name: /第 3 题，未作答/,
    });
    expect(unansweredButton).toHaveClass("is-unanswered");
    fireEvent.click(unansweredButton);
    dialog = screen.getByRole("dialog", { name: unansweredQuestion.stem });
    expect(dialog).toHaveTextContent("你的答案未作答");
    expect(dialog).toHaveTextContent("标准答案1");
    expect(
      document.querySelector('[data-chart-id="item-map"]'),
    ).toHaveTextContent("第 3 题未作答/1，未作答");
  });

  it("renders zero-count timing buckets at zero height", () => {
    const { container } = render(<ReportCharts payload={payload} />);
    const bars = container.querySelectorAll(
      '[data-chart-id="timing"] .assessment-distribution b',
    );
    expect([...bars].map((bar) => (bar as HTMLElement).style.height)).toEqual([
      "0%",
      "100%",
      "0%",
      "0%",
    ]);
  });

  it("explains an empty misconception chart", () => {
    const { container } = render(
      <ReportCharts payload={{ ...payload, misconceptions: [] }} />,
    );
    expect(
      container.querySelector('[data-chart-id="misconceptions"]'),
    ).toHaveTextContent("本次未形成可归类的认知误区");
  });
});
