import { describe, expect, it } from "vitest";
import { buildAssessmentQuality } from "./assessment-quality.js";

describe("assessment item quality", () => {
  it("reports denominator, option choices, timing and low-sample notes", () => {
    const result = buildAssessmentQuality(
      [{ id: "q1", stableKey: "GEO-001", position: 1 }],
      [
        {
          score: 90,
          answers: [
            {
              questionId: "q1",
              selectedOptionId: "a",
              isCorrect: true,
              activeDurationMs: 12_000,
              changeCount: 1,
            },
          ],
        },
        { score: 60, answers: [] },
      ],
    )[0]!;
    expect(result).toMatchObject({
      sampleSize: 2,
      answered: 1,
      correct: 1,
      accuracy: 0.5,
      unanswered: 1,
      medianDurationMs: 12_000,
      p90DurationMs: 12_000,
      rapidAnswerCount: 0,
      changedAnswerCount: 1,
      pointBiserial: null,
      note: "有效作答样本少于 30，暂不计算题目区分度",
    });
    expect(result.optionCounts).toEqual({ a: 1, b: 0, c: 0, d: 0 });
  });

  it("calculates discrimination after the minimum sample", () => {
    const questions = Array.from({ length: 50 }, (_, index) => ({
      id: `q${index + 1}`,
      stableKey: `GEO-${String(index + 1).padStart(3, "0")}`,
      position: index + 1,
    }));
    const attempts = Array.from({ length: 30 }, (_, index) => ({
      score: index < 15 ? 90 : 50,
      answers: [
        {
          questionId: "q1",
          selectedOptionId: index < 15 ? "a" : "b",
          isCorrect: index < 15,
          activeDurationMs: 10_000,
          changeCount: 0,
        },
      ],
    }));
    const result = buildAssessmentQuality(questions, attempts)[0]!;
    expect(result.pointBiserial).toBe(1);
    expect(result.note).toBeNull();
  });

  it("excludes the current item from the total score correlation", () => {
    const questions = Array.from({ length: 50 }, (_, index) => ({
      id: `q${index + 1}`,
      stableKey: `GEO-${String(index + 1).padStart(3, "0")}`,
      position: index + 1,
    }));
    const attempts = Array.from({ length: 30 }, (_, index) => {
      const correct = index < 15;
      return {
        score: correct ? 52 : 50,
        answers: [
          {
            questionId: "q1",
            selectedOptionId: correct ? "a" : "b",
            isCorrect: correct,
            activeDurationMs: 10_000,
            changeCount: 0,
          },
        ],
      };
    });

    expect(
      buildAssessmentQuality(questions, attempts)[0]!.pointBiserial,
    ).toBeNull();
  });

  it("explains missing discrimination when total attempts reach 30 but answers do not", () => {
    const attempts = Array.from({ length: 30 }, (_, index) => ({
      score: 60,
      answers:
        index === 29
          ? []
          : [
              {
                questionId: "q1",
                selectedOptionId: "a",
                isCorrect: true,
                activeDurationMs: 10_000,
                changeCount: 0,
              },
            ],
    }));

    const result = buildAssessmentQuality(
      [{ id: "q1", stableKey: "GEO-001", position: 1 }],
      attempts,
    )[0]!;

    expect(result.pointBiserial).toBeNull();
    expect(result.note).toBe("有效作答样本少于 30，暂不计算题目区分度");
  });
});
