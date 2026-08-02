-- CreateEnum
CREATE TYPE "AssessmentCycleStatus" AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE "AssessmentVersionStatus" AS ENUM ('DRAFT', 'VALIDATED', 'PUBLISHED', 'RETIRED');
CREATE TYPE "AssessmentSourceReviewStatus" AS ENUM ('CURRENT', 'REVIEW_REQUIRED');
CREATE TYPE "AssessmentHumanGateStatus" AS ENUM ('PENDING_HUMAN', 'APPROVED');
CREATE TYPE "AssessmentAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'VOIDED');
CREATE TYPE "AssessmentReportStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_cycles" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "cycle_key" TEXT NOT NULL,
    "status" "AssessmentCycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "daily_limit" INTEGER NOT NULL DEFAULT 1,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_cycles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assessment_cycles_attempt_limits_check" CHECK ("max_attempts" > 0 AND "daily_limit" > 0)
);

CREATE TABLE "assessment_versions" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "status" "AssessmentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "source_review_status" "AssessmentSourceReviewStatus" NOT NULL DEFAULT 'CURRENT',
    "content_review_status" "AssessmentHumanGateStatus" NOT NULL DEFAULT 'PENDING_HUMAN',
    "angoff_status" "AssessmentHumanGateStatus" NOT NULL DEFAULT 'PENDING_HUMAN',
    "pilot_status" "AssessmentHumanGateStatus" NOT NULL DEFAULT 'PENDING_HUMAN',
    "source_commit" TEXT NOT NULL,
    "dataset_version" TEXT NOT NULL,
    "business_hash" TEXT NOT NULL,
    "workflow_hash" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "question_count" INTEGER NOT NULL DEFAULT 50,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "pass_score" INTEGER NOT NULL DEFAULT 80,
    "review_due_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assessment_versions_numbers_check" CHECK ("question_count" > 0 AND "duration_minutes" > 0 AND "pass_score" BETWEEN 0 AND 100)
);

CREATE TABLE "assessment_questions" (
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "stable_key" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "primary_dimension" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "stem" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "delivery_stages" JSONB NOT NULL,
    "business_importance" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assessment_questions_dimension_check" CHECK ("primary_dimension" IN ('D1', 'D2', 'D3', 'D4', 'D5')),
    CONSTRAINT "assessment_questions_source_check" CHECK ("source_type" IN ('PAPER', 'DATA', 'BUSINESS')),
    CONSTRAINT "assessment_questions_difficulty_check" CHECK ("difficulty" IN ('L1', 'L2', 'L3')),
    CONSTRAINT "assessment_questions_importance_check" CHECK ("business_importance" BETWEEN 1 AND 5)
);

CREATE TABLE "assessment_question_keys" (
    "question_id" UUID NOT NULL,
    "correct_option_id" TEXT NOT NULL,
    "option_rationales" JSONB NOT NULL,
    "misconceptions" JSONB NOT NULL,
    "misconception_labels" JSONB NOT NULL,
    "core_rationale" TEXT NOT NULL,
    "reasoning_steps" JSONB NOT NULL,
    "business_application" TEXT NOT NULL,
    "learning_paths" JSONB NOT NULL,
    CONSTRAINT "assessment_question_keys_pkey" PRIMARY KEY ("question_id"),
    CONSTRAINT "assessment_question_keys_option_check" CHECK ("correct_option_id" IN ('a', 'b', 'c', 'd'))
);

CREATE TABLE "assessment_question_sources" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "source_id" TEXT NOT NULL,
    "query_id" TEXT,
    CONSTRAINT "assessment_question_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "quota_date" DATE NOT NULL,
    "status" "AssessmentAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "manifest" JSONB NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "score" INTEGER,
    "answered_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assessment_attempts_number_check" CHECK ("attempt_number" > 0),
    CONSTRAINT "assessment_attempts_score_check" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100),
    CONSTRAINT "assessment_attempts_answered_count_check" CHECK ("answered_count" BETWEEN 0 AND 50),
    CONSTRAINT "assessment_attempts_deadline_check" CHECK ("deadline_at" > "started_at")
);

CREATE TABLE "assessment_answers" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "first_option_id" TEXT NOT NULL,
    "selected_option_id" TEXT NOT NULL,
    "display_order" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "change_count" INTEGER NOT NULL DEFAULT 0,
    "active_duration_ms" INTEGER NOT NULL DEFAULT 0,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_correct" BOOLEAN,
    CONSTRAINT "assessment_answers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assessment_answers_options_check" CHECK ("first_option_id" IN ('a', 'b', 'c', 'd') AND "selected_option_id" IN ('a', 'b', 'c', 'd')),
    CONSTRAINT "assessment_answers_counters_check" CHECK ("revision" > 0 AND "change_count" >= 0 AND "active_duration_ms" >= 0)
);

CREATE TABLE "assessment_reports" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "report_version" TEXT NOT NULL,
    "status" "AssessmentReportStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "generated_at" TIMESTAMP(3),
    "failure_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_overrides" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "reason_code" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessments_slug_key" ON "assessments"("slug");
CREATE INDEX "assessment_cycles_assessment_id_status_starts_at_idx" ON "assessment_cycles"("assessment_id", "status", "starts_at");
CREATE UNIQUE INDEX "assessment_cycles_assessment_id_cycle_key_key" ON "assessment_cycles"("assessment_id", "cycle_key");
CREATE UNIQUE INDEX "assessment_cycles_one_active_per_assessment" ON "assessment_cycles"("assessment_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "assessment_versions_cycle_id_status_published_at_idx" ON "assessment_versions"("cycle_id", "status", "published_at");
CREATE UNIQUE INDEX "assessment_versions_cycle_id_version_key" ON "assessment_versions"("cycle_id", "version");
CREATE UNIQUE INDEX "assessment_versions_one_published_per_cycle" ON "assessment_versions"("cycle_id") WHERE "status" = 'PUBLISHED';
CREATE INDEX "assessment_questions_version_id_primary_dimension_idx" ON "assessment_questions"("version_id", "primary_dimension");
CREATE UNIQUE INDEX "assessment_questions_version_id_stable_key_key" ON "assessment_questions"("version_id", "stable_key");
CREATE UNIQUE INDEX "assessment_questions_version_id_position_key" ON "assessment_questions"("version_id", "position");
CREATE INDEX "assessment_question_sources_source_id_idx" ON "assessment_question_sources"("source_id");
CREATE UNIQUE INDEX "assessment_question_sources_question_id_source_id_key" ON "assessment_question_sources"("question_id", "source_id");
CREATE INDEX "assessment_attempts_user_id_assessment_id_created_at_idx" ON "assessment_attempts"("user_id", "assessment_id", "created_at");
CREATE INDEX "assessment_attempts_cycle_id_quota_date_status_idx" ON "assessment_attempts"("cycle_id", "quota_date", "status");
CREATE UNIQUE INDEX "assessment_attempts_user_id_idempotency_key_key" ON "assessment_attempts"("user_id", "idempotency_key");
CREATE UNIQUE INDEX "assessment_attempts_effective_number_key" ON "assessment_attempts"("user_id", "cycle_id", "attempt_number") WHERE "status" <> 'VOIDED';
CREATE UNIQUE INDEX "assessment_attempts_one_active_per_assessment" ON "assessment_attempts"("user_id", "assessment_id") WHERE "status" = 'IN_PROGRESS';
CREATE UNIQUE INDEX "assessment_attempts_one_effective_per_day" ON "assessment_attempts"("user_id", "assessment_id", "quota_date") WHERE "status" <> 'VOIDED';
CREATE INDEX "assessment_answers_question_id_is_correct_idx" ON "assessment_answers"("question_id", "is_correct");
CREATE UNIQUE INDEX "assessment_answers_attempt_id_question_id_key" ON "assessment_answers"("attempt_id", "question_id");
CREATE UNIQUE INDEX "assessment_reports_attempt_id_key" ON "assessment_reports"("attempt_id");
CREATE UNIQUE INDEX "assessment_overrides_attempt_id_key" ON "assessment_overrides"("attempt_id");

-- AddForeignKey
ALTER TABLE "assessment_cycles" ADD CONSTRAINT "assessment_cycles_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "assessment_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "assessment_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_question_keys" ADD CONSTRAINT "assessment_question_keys_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "assessment_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_question_sources" ADD CONSTRAINT "assessment_question_sources_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "assessment_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "assessment_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "assessment_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "assessment_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_reports" ADD CONSTRAINT "assessment_reports_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_overrides" ADD CONSTRAINT "assessment_overrides_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_overrides" ADD CONSTRAINT "assessment_overrides_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Documentation
COMMENT ON TABLE "assessments" IS '员工培训测评定义';
COMMENT ON TABLE "assessment_cycles" IS '测评资格与次数的认证周期';
COMMENT ON TABLE "assessment_versions" IS '经过校验并可冻结发布的题库版本';
COMMENT ON TABLE "assessment_questions" IS '考试前可见的题面、分类和诊断标签';
COMMENT ON TABLE "assessment_question_keys" IS '与公开题面隔离的标准答案和完整解析';
COMMENT ON TABLE "assessment_question_sources" IS '每道题的来源定位信息';
COMMENT ON TABLE "assessment_attempts" IS '一次不可变的员工考试';
COMMENT ON TABLE "assessment_answers" IS '考试中的最终答案、修改次数与辅助耗时';
COMMENT ON TABLE "assessment_reports" IS '固定版本的个人诊断报告';
COMMENT ON TABLE "assessment_overrides" IS '管理员对异常考试的作废记录';

COMMENT ON COLUMN "assessments"."id" IS '测评稳定标识';
COMMENT ON COLUMN "assessments"."slug" IS '路由和接口使用的稳定键';
COMMENT ON COLUMN "assessments"."title" IS '员工可见标题';
COMMENT ON COLUMN "assessments"."enabled" IS '是否允许展示入口和新建考试';
COMMENT ON COLUMN "assessments"."created_at" IS '创建时间';
COMMENT ON COLUMN "assessments"."updated_at" IS '更新时间';

COMMENT ON COLUMN "assessment_cycles"."id" IS '周期稳定标识';
COMMENT ON COLUMN "assessment_cycles"."assessment_id" IS '所属测评';
COMMENT ON COLUMN "assessment_cycles"."cycle_key" IS '测评内唯一周期键';
COMMENT ON COLUMN "assessment_cycles"."status" IS '周期开放状态';
COMMENT ON COLUMN "assessment_cycles"."max_attempts" IS '周期内最大有效考试次数';
COMMENT ON COLUMN "assessment_cycles"."daily_limit" IS '上海自然日内最大考试次数';
COMMENT ON COLUMN "assessment_cycles"."starts_at" IS '周期开始时间';
COMMENT ON COLUMN "assessment_cycles"."ends_at" IS '周期结束时间';
COMMENT ON COLUMN "assessment_cycles"."created_at" IS '创建时间';

COMMENT ON COLUMN "assessment_versions"."id" IS '版本稳定标识';
COMMENT ON COLUMN "assessment_versions"."cycle_id" IS '所属资格周期';
COMMENT ON COLUMN "assessment_versions"."version" IS '周期内版本号';
COMMENT ON COLUMN "assessment_versions"."status" IS '发布状态';
COMMENT ON COLUMN "assessment_versions"."source_review_status" IS '来源是否仍适用于新考试';
COMMENT ON COLUMN "assessment_versions"."content_review_status" IS '内容人工复核门禁';
COMMENT ON COLUMN "assessment_versions"."angoff_status" IS 'Angoff 定标门禁';
COMMENT ON COLUMN "assessment_versions"."pilot_status" IS '试测分析门禁';
COMMENT ON COLUMN "assessment_versions"."source_commit" IS '上游资料提交';
COMMENT ON COLUMN "assessment_versions"."dataset_version" IS '上游数据版本';
COMMENT ON COLUMN "assessment_versions"."business_hash" IS '公司内容哈希';
COMMENT ON COLUMN "assessment_versions"."workflow_hash" IS '工作流内容哈希';
COMMENT ON COLUMN "assessment_versions"."content_hash" IS '私有题库包内容哈希';
COMMENT ON COLUMN "assessment_versions"."question_count" IS '题目总数';
COMMENT ON COLUMN "assessment_versions"."duration_minutes" IS '限时分钟数';
COMMENT ON COLUMN "assessment_versions"."pass_score" IS '通过分数';
COMMENT ON COLUMN "assessment_versions"."review_due_at" IS '来源复核到期时间';
COMMENT ON COLUMN "assessment_versions"."published_at" IS '发布时间';
COMMENT ON COLUMN "assessment_versions"."created_at" IS '创建时间';

COMMENT ON COLUMN "assessment_questions"."id" IS '题目稳定标识';
COMMENT ON COLUMN "assessment_questions"."version_id" IS '所属题库版本';
COMMENT ON COLUMN "assessment_questions"."stable_key" IS '题库版本内稳定题号';
COMMENT ON COLUMN "assessment_questions"."position" IS '固定基础顺序';
COMMENT ON COLUMN "assessment_questions"."primary_dimension" IS '主诊断维度';
COMMENT ON COLUMN "assessment_questions"."source_type" IS '主要证据类型';
COMMENT ON COLUMN "assessment_questions"."difficulty" IS '难度层级';
COMMENT ON COLUMN "assessment_questions"."topic" IS '论文或业务主题';
COMMENT ON COLUMN "assessment_questions"."stem" IS '题干';
COMMENT ON COLUMN "assessment_questions"."options" IS '四个公开选项';
COMMENT ON COLUMN "assessment_questions"."delivery_stages" IS '交付阶段标签';
COMMENT ON COLUMN "assessment_questions"."business_importance" IS '业务重要度';
COMMENT ON COLUMN "assessment_questions"."created_at" IS '创建时间';

COMMENT ON COLUMN "assessment_question_keys"."question_id" IS '题目标识';
COMMENT ON COLUMN "assessment_question_keys"."correct_option_id" IS '标准答案选项';
COMMENT ON COLUMN "assessment_question_keys"."option_rationales" IS '各选项解析';
COMMENT ON COLUMN "assessment_question_keys"."misconceptions" IS '各选项误区编码';
COMMENT ON COLUMN "assessment_question_keys"."misconception_labels" IS '误区显示名称';
COMMENT ON COLUMN "assessment_question_keys"."core_rationale" IS '核心解析';
COMMENT ON COLUMN "assessment_question_keys"."reasoning_steps" IS '推理步骤';
COMMENT ON COLUMN "assessment_question_keys"."business_application" IS '业务应用说明';
COMMENT ON COLUMN "assessment_question_keys"."learning_paths" IS '建议学习路径';

COMMENT ON COLUMN "assessment_question_sources"."id" IS '来源关系标识';
COMMENT ON COLUMN "assessment_question_sources"."question_id" IS '所属题目';
COMMENT ON COLUMN "assessment_question_sources"."source_id" IS '证据矩阵中的来源编号';
COMMENT ON COLUMN "assessment_question_sources"."query_id" IS '可选数据查询编号';

COMMENT ON COLUMN "assessment_attempts"."id" IS '考试稳定标识';
COMMENT ON COLUMN "assessment_attempts"."user_id" IS '所属员工';
COMMENT ON COLUMN "assessment_attempts"."assessment_id" IS '所属测评';
COMMENT ON COLUMN "assessment_attempts"."cycle_id" IS '所属认证周期';
COMMENT ON COLUMN "assessment_attempts"."version_id" IS '冻结题库版本';
COMMENT ON COLUMN "assessment_attempts"."idempotency_key" IS '客户端创建幂等键';
COMMENT ON COLUMN "assessment_attempts"."attempt_number" IS '周期内考试序号';
COMMENT ON COLUMN "assessment_attempts"."quota_date" IS '上海自然日配额日期';
COMMENT ON COLUMN "assessment_attempts"."status" IS '考试状态';
COMMENT ON COLUMN "assessment_attempts"."manifest" IS '题目和选项顺序快照，不含答案';
COMMENT ON COLUMN "assessment_attempts"."started_at" IS '考试开始时间';
COMMENT ON COLUMN "assessment_attempts"."deadline_at" IS '服务端截止时间';
COMMENT ON COLUMN "assessment_attempts"."submitted_at" IS '提交或超时结算时间';
COMMENT ON COLUMN "assessment_attempts"."score" IS '终态分数';
COMMENT ON COLUMN "assessment_attempts"."answered_count" IS '已保存答案数量，详细答案清理后继续保留';
COMMENT ON COLUMN "assessment_attempts"."created_at" IS '创建时间';
COMMENT ON COLUMN "assessment_attempts"."updated_at" IS '更新时间';

COMMENT ON COLUMN "assessment_answers"."id" IS '答案稳定标识';
COMMENT ON COLUMN "assessment_answers"."attempt_id" IS '所属考试';
COMMENT ON COLUMN "assessment_answers"."question_id" IS '所属题目';
COMMENT ON COLUMN "assessment_answers"."first_option_id" IS '首次选择';
COMMENT ON COLUMN "assessment_answers"."selected_option_id" IS '当前选择';
COMMENT ON COLUMN "assessment_answers"."display_order" IS '本次展示的选项顺序';
COMMENT ON COLUMN "assessment_answers"."revision" IS '乐观锁版本';
COMMENT ON COLUMN "assessment_answers"."change_count" IS '选择变更次数';
COMMENT ON COLUMN "assessment_answers"."active_duration_ms" IS '页面活跃时长，单位毫秒';
COMMENT ON COLUMN "assessment_answers"."answered_at" IS '最近作答时间';
COMMENT ON COLUMN "assessment_answers"."is_correct" IS '终态正确性';

COMMENT ON COLUMN "assessment_reports"."id" IS '报告稳定标识';
COMMENT ON COLUMN "assessment_reports"."attempt_id" IS '一次考试仅有一份报告';
COMMENT ON COLUMN "assessment_reports"."report_version" IS '报告算法与模板版本';
COMMENT ON COLUMN "assessment_reports"."status" IS '生成状态';
COMMENT ON COLUMN "assessment_reports"."payload" IS '可复算的结构化报告快照';
COMMENT ON COLUMN "assessment_reports"."generated_at" IS '报告生成完成时间';
COMMENT ON COLUMN "assessment_reports"."failure_code" IS '安全的失败代码';
COMMENT ON COLUMN "assessment_reports"."created_at" IS '创建时间';

COMMENT ON COLUMN "assessment_overrides"."id" IS '作废记录标识';
COMMENT ON COLUMN "assessment_overrides"."attempt_id" IS '每次考试最多一条作废记录';
COMMENT ON COLUMN "assessment_overrides"."actor_id" IS '管理员标识';
COMMENT ON COLUMN "assessment_overrides"."reason_code" IS '受控原因编码';
COMMENT ON COLUMN "assessment_overrides"."reason" IS '详细原因';
COMMENT ON COLUMN "assessment_overrides"."created_at" IS '创建时间';
