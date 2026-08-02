type QualityAnswer = {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean | null;
  activeDurationMs: number;
  changeCount: number;
};

type QualityAttempt = {
  score: number | null;
  answers: QualityAnswer[];
};

type QualityQuestion = {
  id: string;
  stableKey: string;
  position: number;
};

const percentile = (values: number[], fraction: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]!;
};

const pointBiserial = (values: Array<{ item: number; score: number }>) => {
  if (values.length < 30) return null;
  const itemMean =
    values.reduce((sum, value) => sum + value.item, 0) / values.length;
  const scoreMean =
    values.reduce((sum, value) => sum + value.score, 0) / values.length;
  const covariance = values.reduce(
    (sum, value) => sum + (value.item - itemMean) * (value.score - scoreMean),
    0,
  );
  const itemVariance = values.reduce(
    (sum, value) => sum + (value.item - itemMean) ** 2,
    0,
  );
  const scoreVariance = values.reduce(
    (sum, value) => sum + (value.score - scoreMean) ** 2,
    0,
  );
  if (itemVariance === 0 || scoreVariance === 0) return null;
  return Number(
    (covariance / Math.sqrt(itemVariance * scoreVariance)).toFixed(4),
  );
};

export function buildAssessmentQuality(
  questions: QualityQuestion[],
  attempts: QualityAttempt[],
) {
  const itemScoreWeight = questions.length ? 100 / questions.length : 0;
  return questions.map((question) => {
    const answers = attempts.flatMap((attempt) => {
      const answer = attempt.answers.find(
        (item) => item.questionId === question.id,
      );
      return answer ? [{ attempt, answer }] : [];
    });
    const correct = answers.filter((item) => item.answer.isCorrect).length;
    const optionCounts = Object.fromEntries(
      ["a", "b", "c", "d"].map((option) => [
        option,
        answers.filter((item) => item.answer.selectedOptionId === option)
          .length,
      ]),
    );
    const durations = answers.map((item) => item.answer.activeDurationMs);
    const scorePairs = answers.flatMap((item) =>
      item.attempt.score === null
        ? []
        : [
            {
              item: item.answer.isCorrect ? 1 : 0,
              score:
                item.attempt.score -
                (item.answer.isCorrect ? itemScoreWeight : 0),
            },
          ],
    );
    return {
      questionId: question.id,
      stableKey: question.stableKey,
      position: question.position,
      sampleSize: attempts.length,
      answered: answers.length,
      correct,
      accuracy: attempts.length ? correct / attempts.length : 0,
      unanswered: attempts.length - answers.length,
      optionCounts,
      medianDurationMs: percentile(durations, 0.5),
      p90DurationMs: percentile(durations, 0.9),
      rapidAnswerCount: durations.filter((duration) => duration < 5_000).length,
      changedAnswerCount: answers.filter((item) => item.answer.changeCount > 0)
        .length,
      pointBiserial: pointBiserial(scorePairs),
      note:
        answers.length < 30 ? "有效作答样本少于 30，暂不计算题目区分度" : null,
    };
  });
}
