import { describe, expect, it } from "vitest";
import { validateAssessmentPack } from "./assessment-pack.js";

const makePack = () => ({
  schemaVersion: "1.0.0",
  assessment: {
    slug: "geo-foundations",
    title: "GEO 基础能力测评",
    version: "1.0.0",
    purpose: "TRAINING_MASTERY",
    questionCount: 50,
    durationMinutes: 30,
    passScore: 80,
    dailyLimit: 1,
    cycleAttemptLimit: 3,
    sourceCommit: "a".repeat(40),
    datasetVersion: "2.0.1",
    businessContentHash: "b".repeat(64),
    workflowHash: "c".repeat(64),
    sourceReviewStatus: "CURRENT",
    contentReviewStatus: "PENDING_HUMAN",
    angoffStatus: "PENDING_HUMAN",
    pilotStatus: "PENDING_HUMAN",
  },
  questions: Array.from({ length: 50 }, (_, index) => {
    const sourceType = index < 30 ? "PAPER" : index < 40 ? "DATA" : "BUSINESS";
    return {
      id: `GEO-${String(index + 1).padStart(3, "0")}`,
      primaryDimension: `D${Math.floor(index / 10) + 1}`,
      sourceType,
      difficulty: index < 10 ? "L1" : index < 35 ? "L2" : "L3",
      topic: "FOUNDATION",
      deliveryStages: ["diagnosis"],
      businessImportance: 3,
      ...(sourceType === "DATA" ? { evidenceQueryId: "DQ-001" } : {}),
      stem: `第 ${index + 1} 题应如何判断？`,
      options: [
        { id: "a", text: "选项 A", rationale: "A 解析", misconception: "M-A" },
        { id: "b", text: "选项 B", rationale: "B 解析", misconception: null },
        { id: "c", text: "选项 C", rationale: "C 解析", misconception: "M-C" },
        { id: "d", text: "选项 D", rationale: "D 解析", misconception: "M-D" },
      ],
      correctOptionId: "b",
      coreRationale: "依据证据边界判断。",
      reasoningSteps: ["确认问题", "核对证据"],
      businessApplication: "用于客户项目复核。",
      sourceIds: [
        sourceType === "PAPER" ? "P01" : sourceType === "DATA" ? "D01" : "B01",
      ],
      learningPath: ["/workflow"],
    };
  }),
});

describe("assessment pack validation", () => {
  it("accepts the exact 6:2:2, dimension and difficulty blueprint", () => {
    const result = validateAssessmentPack(JSON.stringify(makePack()));
    expect(result.summary).toMatchObject({
      questions: 50,
      sources: { PAPER: 30, DATA: 10, BUSINESS: 10 },
      difficulties: { L1: 10, L2: 25, L3: 15 },
      humanGatesApproved: false,
    });
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects a pack that violates the evidence blueprint", () => {
    const pack = makePack();
    pack.questions[29]!.sourceType = "BUSINESS";
    expect(() => validateAssessmentPack(JSON.stringify(pack))).toThrow(
      "题库配比",
    );
  });

  it("rejects imported claims that human review is already approved", () => {
    const pack = makePack();
    pack.assessment.contentReviewStatus = "APPROVED";
    expect(() => validateAssessmentPack(JSON.stringify(pack))).toThrow();
  });

  it("rejects a pack whose correct answers expose a systematic length cue", () => {
    const pack = makePack();
    for (const question of pack.questions)
      question.options[1]!.text =
        "这是一个明显比其余三个候选项更长且持续暴露答案位置的正确选项";

    expect(() => validateAssessmentPack(JSON.stringify(pack))).toThrow(
      "正确答案存在系统性长度线索",
    );
  });

  it("rejects a pack whose distractors expose a systematic absolute-word cue", () => {
    const pack = makePack();
    for (const question of pack.questions)
      for (const option of question.options)
        if (option.id !== question.correctOptionId)
          option.text = `只${option.text}，其他判断完全不需要考虑`;

    expect(() => validateAssessmentPack(JSON.stringify(pack))).toThrow(
      "干扰项存在系统性绝对化措辞线索",
    );
  });
});
