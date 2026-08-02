import { describe, expect, it } from "vitest";
import { internalLearningPath, learningPathLabel } from "./assessment-utils";

describe("assessment report learning paths", () => {
  it("turns known routes into employee-facing labels", () => {
    expect(learningPathLabel("/company")).toBe("公司与业务");
    expect(learningPathLabel("/workflow")).toBe("GEO 工作流");
    expect(learningPathLabel("/systems")).toBe("系统与工具");
    expect(learningPathLabel("/workflow/diagnosis")).toBe("诊断工作流");
    expect(learningPathLabel("/workflow/measurement")).toBe("测量工作流");
  });

  it("only returns safe same-site learning routes", () => {
    expect(internalLearningPath("/workflow")).toBe("/workflow");
    expect(internalLearningPath("//malicious.example/path")).toBeNull();
    expect(internalLearningPath("/workflow//diagnosis")).toBeNull();
    expect(internalLearningPath("javascript:alert(1)")).toBeNull();
    expect(internalLearningPath("/workflow/../admin")).toBeNull();
  });
});
