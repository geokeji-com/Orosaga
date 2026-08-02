export const ASSESSMENT_DURATION_MS = 30 * 60 * 1000;

export function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const learningPathLabels: Record<string, string> = {
  "/company": "公司与业务",
  "/workflow": "GEO 工作流",
  "/workflow/diagnosis": "诊断工作流",
  "/workflow/measurement": "测量工作流",
  "/systems": "系统与工具",
  "/camps": "学习营地",
};

export function learningPathLabel(path: string) {
  return learningPathLabels[path] ?? "内部学习资料";
}

export function internalLearningPath(path: string) {
  return /^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(path) ? path : null;
}
