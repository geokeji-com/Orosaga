import { createHash } from "node:crypto";
import {
  assessmentImportPackSchema,
  type AssessmentImportPack,
} from "@orosaga/contracts";

const countBy = <T>(values: T[], keyOf: (value: T) => string) =>
  values.reduce<Record<string, number>>((result, value) => {
    const key = keyOf(value);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});

const assertExact = (
  label: string,
  actual: Record<string, number>,
  expected: Record<string, number>,
) => {
  const matches = Object.entries(expected).every(
    ([key, count]) => actual[key] === count,
  );
  if (!matches)
    throw new Error(
      `题库配比不符合要求：${label}，实际 ${JSON.stringify(actual)}，要求 ${JSON.stringify(expected)}`,
    );
};

const optionLength = (value: string) =>
  [...value.trim().replaceAll(/\s+/g, "")].length;

const absoluteCue =
  /只|完全|永远|无需|全部|一定|任意|始终|直接|统一|自动|固定|停止|不需要|没有任何|可以省略|唯一/;

export const validateAssessmentPack = (raw: string) => {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("题库文件不是有效 JSON");
  }
  const pack = assessmentImportPackSchema.parse(json);
  const ids = new Set(pack.questions.map((question) => question.id));
  const stems = new Set(
    pack.questions.map((question) => question.stem.trim().toLocaleLowerCase()),
  );
  if (ids.size !== pack.questions.length) throw new Error("题库存在重复题号");
  if (stems.size !== pack.questions.length) throw new Error("题库存在重复题干");

  const uniqueLongestCorrect = pack.questions.filter((question) => {
    const lengths = question.options.map((option) => optionLength(option.text));
    const correctLength = optionLength(
      question.options.find((option) => option.id === question.correctOptionId)!
        .text,
    );
    return (
      correctLength === Math.max(...lengths) &&
      lengths.filter((length) => length === correctLength).length === 1
    );
  });
  if (uniqueLongestCorrect.length > pack.questions.length * 0.4)
    throw new Error(
      `正确答案存在系统性长度线索：${uniqueLongestCorrect.length}/${pack.questions.length} 题的正确项是唯一最长选项`,
    );
  const absoluteDistractorCue = pack.questions.filter((question) => {
    const correct = question.options.find(
      (option) => option.id === question.correctOptionId,
    )!;
    return (
      !absoluteCue.test(correct.text) &&
      question.options
        .filter((option) => option.id !== question.correctOptionId)
        .every((option) => absoluteCue.test(option.text))
    );
  });
  if (absoluteDistractorCue.length > pack.questions.length * 0.1)
    throw new Error(
      `干扰项存在系统性绝对化措辞线索：${absoluteDistractorCue.length}/${pack.questions.length} 题的三个干扰项均含绝对化措辞`,
    );

  const dimensions = countBy(
    pack.questions,
    (question) => question.primaryDimension,
  );
  const sources = countBy(pack.questions, (question) => question.sourceType);
  const difficulties = countBy(
    pack.questions,
    (question) => question.difficulty,
  );
  assertExact("五个诊断维度", dimensions, {
    D1: 10,
    D2: 10,
    D3: 10,
    D4: 10,
    D5: 10,
  });
  assertExact("6:2:2 证据来源", sources, {
    PAPER: 30,
    DATA: 10,
    BUSINESS: 10,
  });
  assertExact("难度层级", difficulties, { L1: 10, L2: 25, L3: 15 });

  return {
    pack: pack as AssessmentImportPack,
    contentHash: createHash("sha256").update(raw).digest("hex"),
    summary: {
      questions: pack.questions.length,
      dimensions,
      sources,
      difficulties,
      evidenceQueries: pack.questions.filter(
        (question) =>
          question.sourceType === "DATA" && question.evidenceQueryId,
      ).length,
      distractorMisconceptions: pack.questions.reduce(
        (count, question) =>
          count +
          question.options.filter(
            (option) =>
              option.id !== question.correctOptionId && option.misconception,
          ).length,
        0,
      ),
      uniqueLongestCorrect: uniqueLongestCorrect.length,
      absoluteDistractorCue: absoluteDistractorCue.length,
      humanGatesApproved: false,
    },
  };
};
