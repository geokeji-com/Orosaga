import { describe, expect, it } from "vitest";
import { courseStepSchema } from "@orosaga/contracts";
import { courseLessons, courseStepFor } from "./course-catalog";

const expectedActionLabels = [
  ["现场我看懂了，看看四步链路", "四步链路我理解了，来做判断"],
  ["搜索现场清楚了，看看五段链", "五段搜索链我理解了，来做判断"],
  ["协同场景清楚了，看看边界", "协同边界我理解了，来做判断"],
  ["证据问题清楚了，看看边界阶梯", "证据边界我理解了，来做判断"],
  ["用户问题清楚了，开始拆问句", "监测问句我会拆了，来做判断"],
  ["事实材料清楚了，看看知识卡", "知识卡结构我理解了，来做判断"],
  ["内容任务清楚了，看看答案单元", "答案单元我理解了，来做判断"],
  ["信源场景清楚了，看看四层图谱", "四层信源我理解了，来做判断"],
  ["指标问题清楚了，看看指标树", "四层指标树我理解了，来做判断"],
  ["采集问题清楚了，看看采样方法", "多轮采样我理解了，来做判断"],
  ["归因难点清楚了，看看证据阶梯", "归因证据我理解了，来做判断"],
  ["诊断问题清楚了，看看优先级", "优先级矩阵我理解了，来做判断"],
  ["交接现场清楚了，看看首周路径", "首周路径我理解了，来做判断"],
  ["生产问题清楚了，看看完整管道", "生产管道我理解了，来做判断"],
  ["母稿任务清楚了，看看审核门", "五道审核门我理解了，来做判断"],
  ["发布现场清楚了，看看追踪状态", "引用状态机我理解了，来做判断"],
  ["回流场景清楚了，看看验证闭环", "验证闭环我理解了，来做判断"],
  ["客户问题清楚了，看看沟通漏斗", "沟通漏斗我理解了，来做判断"],
  ["风险场景清楚了，看看恢复链", "风险恢复链我理解了，来做判断"],
  ["实战任务清楚了，打开综合工作台", "综合工作台我理解了，完成最后判断"],
] as const;

const expectedModelLayouts = [
  "journey",
  "pipeline",
  "overlap",
  "staircase",
  "funnel",
  "layers",
  "answer-unit",
  "network",
  "tree",
  "experiment",
  "evidence-ladder",
  "matrix",
  "roadmap",
  "production-line",
  "gates",
  "state-machine",
  "feedback-loop",
  "conversation-funnel",
  "recovery-chain",
  "workbench",
] as const;

describe("course catalog action copy", () => {
  it("provides validated, contextual actions for all sixty steps", () => {
    expect(courseLessons).toHaveLength(20);

    courseLessons.forEach((lesson, index) => {
      const expected = expectedActionLabels[index];
      if (!expected) throw new Error(`Missing expected copy for ${lesson.key}`);
      const story = courseStepFor(lesson, `${lesson.key}-story`);
      const model = courseStepFor(lesson, `${lesson.key}-model`);
      const practice = courseStepFor(lesson, `${lesson.key}-practice`);

      expect(story?.actionLabel).toBe(expected[0]);
      expect(model?.actionLabel).toBe(expected[1]);
      expect(practice?.actionLabel).toBe("提交我的判断");

      for (const step of [story, model, practice]) {
        expect(
          courseStepSchema.safeParse({ ...step, completed: false }).success,
        ).toBe(true);
      }
    });
  });

  it("assigns one validated visual structure to every lesson", () => {
    const layouts = courseLessons.map((lesson) => lesson.modelLayout);

    expect(layouts).toEqual(expectedModelLayouts);
    expect(new Set(layouts)).toHaveLength(20);

    courseLessons.forEach((lesson) => {
      const model = courseStepFor(lesson, `${lesson.key}-model`);
      const parsed = courseStepSchema.parse({ ...model, completed: false });
      expect(parsed.model?.layout).toBe(lesson.modelLayout);
      expect(parsed.model?.category).not.toHaveLength(0);
      expect(parsed.model?.readingHint).not.toHaveLength(0);
      expect(new Set(parsed.model?.nodes.map((node) => node.key)).size).toBe(
        lesson.modelNodes.length,
      );
      expect(new Set(parsed.model?.nodes.map((node) => node.label)).size).toBe(
        lesson.modelNodes.length,
      );
      for (const node of parsed.model?.nodes ?? [])
        expect(node.key).toMatch(/^lesson-\d{2}-model-[a-z][a-z-]*$/);
    });

    expect(courseLessons.map((lesson) => lesson.modelNodes.length)).toEqual([
      4, 5, 4, 3, 4, 4, 4, 4, 4, 3, 4, 4, 3, 4, 5, 5, 4, 4, 4, 5,
    ]);
  });
});
