import type { z } from "zod";
import { saveWorkflowSchema } from "@orosaga/contracts";

export type WorkflowDefault = z.infer<typeof saveWorkflowSchema>;

export const workflowDefault: WorkflowDefault = {
  expectedVersion: 1,
  title: "运营工作流",
  stages: [
    {
      key: "intake",
      shortTitle: "项目接入",
      title: "客户接入与项目建档",
      summary: "把销售阶段的信息转成运营可以直接接手的项目上下文。",
      owner: "销售 → 运营",
      system: "Clients & Projects",
      iconKey: "clipboard",
      inputs: ["客户与行业信息", "核心关键词与服务范围", "合同预算与交付节奏"],
      actions: [
        "拓展 10–20 个服务问句",
        "拉群并发起资料收集",
        "建立项目档案并分配负责人",
      ],
      done: [
        "关键词与问句已经入库",
        "资料目录可访问且缺口已标记",
        "项目成员和首个里程碑已确认",
      ],
      outputs: ["项目档案", "问句清单", "资料收集清单"],
      next: "进入知识库构建",
      position: 0,
    },
    {
      key: "knowledge",
      shortTitle: "知识库构建",
      title: "构建 QMap 与 Card Pack",
      summary:
        "让品牌事实、竞品信息和写作背景各归其位，成为后续生产的可靠底座。",
      owner: "项目运营",
      system: "Knowledge Studio",
      iconKey: "database",
      inputs: ["客户原始资料", "品牌与产品事实", "竞品及行业背景"],
      actions: [
        "生成 QMap 与卡片骨架",
        "清洗素材并预览归位方案",
        "确认写入并追踪空字段",
      ],
      done: [
        "Query 与目标实体映射正确",
        "归位方案经人工确认后写入",
        "空字段已形成客户补充清单",
      ],
      outputs: ["QMap", "Card Pack", "Fill Plan"],
      next: "启动内容生产",
      position: 1,
    },
    {
      key: "content",
      shortTitle: "内容生产",
      title: "从知识资产生成可投母稿",
      summary:
        "选择 Card Pack 生成或高引用仿写策略，把 Query 转为可审核、可追溯的文章。",
      owner: "项目运营 + AI Skill",
      system: "Content Studio",
      iconKey: "file",
      inputs: ["已确认的 QMap", "完整 Card Pack", "文章策略与目标 Query"],
      actions: [
        "确认 Query、文章类型和竞品",
        "批量执行生成或仿写",
        "预览、编辑并检查 Production Log",
      ],
      done: [
        "Query 已在 QMap 中精确匹配",
        "事实与竞品引用可追溯",
        "母稿审核后标记为待投放",
      ],
      outputs: ["Markdown 母稿", "Production Log", "待投放候选"],
      next: "制定投放计划",
      position: 2,
    },
    {
      key: "publishing",
      shortTitle: "投放发布",
      title: "从母稿到媒体回链",
      summary: "结合平台召回特性和预算，把文章送到更有机会被 AI 召回的信源。",
      owner: "项目运营",
      system: "Channels & Publishing",
      iconKey: "workflow",
      inputs: ["待投母稿", "媒体资源与召回特性", "项目预算余量"],
      actions: [
        "生成文章 × 媒体投放建议",
        "预览成本并确认投放计划",
        "即时或定时发布并同步状态",
      ],
      done: [
        "预算约束校验通过",
        "花钱动作完成二次确认",
        "发布账本与媒体回链已生成",
      ],
      outputs: ["投放计划", "发布账本", "Receipt URL"],
      next: "发起引用追踪",
      position: 3,
    },
    {
      key: "citation",
      shortTitle: "引用追踪",
      title: "确认内容是否进入 AI 回答",
      summary:
        "用发布回链作为匹配锚点，持续观察各平台对文章和问句的真实引用表现。",
      owner: "项目运营",
      system: "Citation & Analytics",
      iconKey: "radar",
      inputs: ["已发布文章回链", "POI 项目 URL 库", "采集批次与检测阈值"],
      actions: [
        "同步回链到 POI 项目",
        "创建引用检测并读取结果",
        "按平台与时间窗汇总表现",
      ],
      done: [
        "引用与未引用条目均可定位",
        "最近一次 / 7 天 / 30 天口径一致",
        "异常回链和匹配结果已复核",
      ],
      outputs: ["引用检测记录", "平台分布", "待优化清单"],
      next: "进入策略复盘",
      position: 4,
    },
    {
      key: "iteration",
      shortTitle: "策略迭代",
      title: "把结果沉淀为下一轮优势",
      summary:
        "分析未引用原因、保留高引用样本，让每轮数据都能改进知识库、内容和投放策略。",
      owner: "项目运营 + 负责人",
      system: "Analytics + Knowledge Base",
      iconKey: "chart",
      inputs: ["引用数据与平台差异", "未引用问句和文章", "项目过程反馈"],
      actions: [
        "定位内容、信源或预算问题",
        "制定下一轮优化动作",
        "回流高引用文章与有效经验",
      ],
      done: [
        "问题已转成明确责任与动作",
        "高引用文章进入好文章库",
        "SOP、Card Pack 或召回特性已更新",
      ],
      outputs: ["数据复盘", "优化任务", "高引用资产"],
      next: "回到新一轮生产",
      position: 5,
    },
  ],
};
