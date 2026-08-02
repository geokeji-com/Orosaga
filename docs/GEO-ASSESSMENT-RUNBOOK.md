# GEO 基础能力测评运行手册

## 当前发布边界

测评引擎、页面、评分、报告、管理门禁和运维命令可以随应用部署。正式题库需要依次完成人工内容复核、修订 Angoff 定标和代表性新人试测。三项门禁均为 `APPROVED` 且来源状态为 `CURRENT` 后，管理员才能发布版本。

正式题目、标准答案、逐项解析和误区标签始终保存在仓库外的受控题库包中。应用镜像、前端 Bundle、接口日志和本运行手册均不包含正式答案。

## 受控文件准备

生产服务器建议使用以下目录和权限：

```bash
install -d -o root -g orosaga-import -m 0750 /secure/orosaga-assessment
install -o root -g orosaga-import -m 0640 \
  geo-foundations-v1.review.json \
  /secure/orosaga-assessment/geo-foundations-v1.review.json
```

运维负责人核对评审记录中的 SHA-256、来源提交、数据集版本、业务内容哈希和工作流哈希。核对值应与受控评审包的 `MANIFEST.md` 一致。禁止把题库文件复制到 release 目录、镜像构建上下文、对象存储公开目录或应用日志。

## 部署与导入顺序

1. 创建数据库备份并记录快照 ID。
2. 部署增量 Migration、API、Worker 和 Web，保持测评入口不可新建考试。
3. 将题库文件以只读方式挂载到一次性 `ops` 容器。
4. 导入为 `DRAFT` 版本并核对命令输出的内容指纹和 50 题配比；新周期在发布前保持 `CLOSED`。
5. 在 `/admin/assessments` 执行机器校验。
6. 人工评审完成后录入评审引用和最终通过线。
7. 使用测试员工完成登录、答题、超时、交卷、报告与打印验收。
8. 发布题库版本，确认首页新手路线显示可用状态。

导入命令：

```bash
$OROSAGA_COMPOSE --profile operations run --rm \
  -v /secure/orosaga-assessment:/assessment-import:ro \
  -e OROSAGA_ASSESSMENT_IMPORT_ROOT=/assessment-import \
  ops node apps/api/dist/cli/import-assessment.js \
  --file geo-foundations-v1.review.json \
  --cycle 2026-H2
```

命令会校验文件真实路径必须位于受控根目录内，并检查题量、四选一、维度、30/10/10 来源配比、10/25/15 难度配比、数据查询引用、证据定位、误区编码和内容指纹。同一周期内相同版本不能重复导入。导入包中的三项人工门禁只能为 `PENDING_HUMAN`，审批状态和评审引用必须由管理员在导入后录入。

## 发布门禁

管理页面按以下顺序操作：

1. “机器校验”确认 50 题、50 份答案键、来源完整性和既定配比。
2. “录入人工门禁”填写至少 10 个字符的飞书评审文档链接、评审单号或会议纪要编号，并填写最终通过线。
3. “发布”校验人工审批审计记录，将当前版本设为 `PUBLISHED`，关闭旧周期并退役同一测评的其他发布版本。

公司页或核心工作流发布新内容后，全部未归档候选和当前题库自动进入 `REVIEW_REQUIRED`，内容人工门禁回到 `PENDING_HUMAN`。来源复核日期到期后，服务端同样暂停新建考试。进行中的考试继续使用已冻结题库完成，历史报告保持可读。

## 上线验收

至少使用一个管理员账号和两个员工测试账号完成：

- 飞书登录后深链返回正确页面。
- 首页入口显示剩余次数、进行中状态或最好成绩。
- 50 道题逐页显示，数字键 1 至 4 可以选择，刷新后答案仍在。
- 多标签页同时开始只产生一次考试；同一上海自然日第二次开始被拒绝。
- 30 分钟截止时间由服务端决定；浏览器改时钟不改变服务端资格。
- 主动交卷和超时结算均生成稳定成绩，未答题计 0。
- 报告至少展示 13 张图、等价数据表、逐题解析和个性化建议。
- 核心报告与答案附录分别完成 A4 打印或保存 PDF。
- 普通员工无法进入 `/admin/assessments`，也无法读取他人考试和报告。
- 管理员查看个人报告、发布、停用和作废操作均产生审计记录。

## 回退与异常处理

常规回退步骤：

1. 在管理页停用当前题库版本，停止创建新考试。
2. 保留已经开始的考试和全部历史数据。
3. 将应用切回上一 release，数据库新增表继续保留。
4. 修复后创建新题库版本并重新完成机器与人工门禁。

发现答案错误、评分错误或泄露风险时，先暂停新考试。管理员根据受影响范围逐条作废考试并填写原因。作废记录释放员工次数；`SECURITY` 和 `CONTENT_ERROR` 会同时撤回员工可读的答案与逐题解析，技术类作废继续保留只读报告。历史记录和审计信息继续保留。数据库回退依赖发布前备份在隔离实例验证，生产环境不执行降级 SQL。

## 个人数据保留

默认策略：

- 最后一次有效考试满 12 个月后，清理该员工在目标测评中的详细答案和个人报告正文，保留分数、通过状态、题库版本和已答数量。
- 单次成绩摘要与关联审计记录满 24 个月后清理。
- 清理命令默认只预览，输出目标数量和稳定摘要，不输出员工身份或答案。

预览：

```bash
$OROSAGA_COMPOSE --profile operations run --rm \
  ops node apps/api/dist/cli/assessment-retention.js \
  --assessment geo-foundations \
  --as-of 2026-08-03
```

负责人核对测评 slug、两个截止日期、目标数量和 `targetDigest` 后执行：

```bash
$OROSAGA_COMPOSE --profile operations run --rm \
  ops node apps/api/dist/cli/assessment-retention.js \
  --assessment geo-foundations \
  --as-of 2026-08-03 \
  --apply \
  --confirm-assessment geo-foundations \
  --confirm-digest <预览输出的 targetDigest> \
  --max-targets <预览输出的 totalTargets>
```

执行阶段会在事务内重新计算目标集合；摘要绑定测评 ID/slug、`asOf`、两个截止日期，以及每条记录的“详细数据脱敏/成绩摘要删除”操作类别。任一边界、操作分类、目标、目标上限或测评标识发生变化时立即停止。`--as-of` 不接受未来日期。重复执行时已处理记录不会再次进入目标集。正式启用定时清理前，培训负责人和安全负责人需要书面确认 12/24 个月期限。

## 监控与例行复核

持续观察以下指标：

- 创建考试成功率及 `DAILY_LIMIT_REACHED`、`ATTEMPT_LIMIT_REACHED`、`REVIEW_REQUIRED` 分布。
- 答案保存错误率、版本冲突率与 P95 延迟。
- 超时结算数量、报告生成失败率和报告生成时长。
- 题库来源复核到期日、内容指纹和运行版本。
- 首考单题正确率、未答率、中位用时、P90 用时、快速作答、修改率和样本达到 30 后的区分度。
- 管理员查看个人报告、题库发布、停用、作废与数据保留操作。

题目质量只按题库版本和首考样本解释。单题有效作答样本少于 30 时，管理页隐藏区分度结论并显示样本不足说明。题目修订通过新版本完成，已发布版本保持冻结。
