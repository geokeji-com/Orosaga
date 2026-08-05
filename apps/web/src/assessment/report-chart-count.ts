import type { AssessmentReportPayload } from "@orosaga/contracts";

export function reportChartCount(payload: AssessmentReportPayload) {
  const hasScoreHistory = payload.history.length > 1;
  const hasDimensionHistory =
    payload.history.filter(
      (item) => Object.keys(item.dimensionScores).length > 0,
    ).length > 1;
  return 14 + Number(hasScoreHistory) + Number(hasDimensionHistory);
}
