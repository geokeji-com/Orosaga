-- CreateEnum
CREATE TYPE "CourseEnrollmentStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "course_enrollments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_slug" TEXT NOT NULL,
    "course_version" TEXT NOT NULL,
    "status" "CourseEnrollmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "idempotency_key" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_step_progress" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "step_key" TEXT NOT NULL,
    "operation_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "course_step_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_exercise_attempts" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "exercise_key" TEXT NOT NULL,
    "selected_option_id" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "operation_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "course_exercise_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "course_exercise_attempts_option_check" CHECK ("selected_option_id" IN ('a', 'b', 'c', 'd'))
);

CREATE TABLE "course_feedback" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "usefulness" INTEGER NOT NULL,
    "clarity" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "recommendation" INTEGER NOT NULL,
    "most_helpful_lesson_key" TEXT,
    "comment" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "course_feedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "course_feedback_scores_check" CHECK (
      "usefulness" BETWEEN 1 AND 5 AND
      "clarity" BETWEEN 1 AND 5 AND
      "difficulty" BETWEEN 1 AND 5 AND
      "recommendation" BETWEEN 1 AND 5
    )
);

-- CreateIndex
CREATE INDEX "course_enrollments_user_id_status_updated_at_idx" ON "course_enrollments"("user_id", "status", "updated_at");
CREATE UNIQUE INDEX "course_enrollments_user_id_course_slug_course_version_key" ON "course_enrollments"("user_id", "course_slug", "course_version");
CREATE UNIQUE INDEX "course_enrollments_user_id_idempotency_key_key" ON "course_enrollments"("user_id", "idempotency_key");
CREATE INDEX "course_step_progress_enrollment_id_completed_at_idx" ON "course_step_progress"("enrollment_id", "completed_at");
CREATE UNIQUE INDEX "course_step_progress_enrollment_id_step_key_key" ON "course_step_progress"("enrollment_id", "step_key");
CREATE UNIQUE INDEX "course_step_progress_enrollment_id_operation_id_key" ON "course_step_progress"("enrollment_id", "operation_id");
CREATE INDEX "course_exercise_attempts_enrollment_id_exercise_key_created_at_idx" ON "course_exercise_attempts"("enrollment_id", "exercise_key", "created_at");
CREATE UNIQUE INDEX "course_exercise_attempts_enrollment_id_operation_id_key" ON "course_exercise_attempts"("enrollment_id", "operation_id");
CREATE UNIQUE INDEX "course_attempt_answer_key" ON "course_exercise_attempts"("enrollment_id", "exercise_key", "selected_option_id");
CREATE UNIQUE INDEX "course_feedback_enrollment_id_key" ON "course_feedback"("enrollment_id");

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_step_progress" ADD CONSTRAINT "course_step_progress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "course_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_exercise_attempts" ADD CONSTRAINT "course_exercise_attempts_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "course_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_feedback" ADD CONSTRAINT "course_feedback_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "course_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Documentation
COMMENT ON TYPE "CourseEnrollmentStatus" IS '课程学习记录状态枚举';
COMMENT ON TABLE "course_enrollments" IS '员工在固定课程版本中的学习注册';
COMMENT ON TABLE "course_step_progress" IS '课程步骤的幂等完成记录';
COMMENT ON TABLE "course_exercise_attempts" IS '课程练习的结构化作答记录';
COMMENT ON TABLE "course_feedback" IS '员工对一门课程的一份可更新评价';

COMMENT ON COLUMN "course_enrollments"."id" IS '课程注册主键';
COMMENT ON COLUMN "course_enrollments"."user_id" IS '学习员工标识';
COMMENT ON COLUMN "course_enrollments"."course_slug" IS '课程稳定路由键';
COMMENT ON COLUMN "course_enrollments"."course_version" IS '开始学习时固定的课程版本';
COMMENT ON COLUMN "course_enrollments"."status" IS '当前学习状态';
COMMENT ON COLUMN "course_enrollments"."idempotency_key" IS '幂等创建键';
COMMENT ON COLUMN "course_enrollments"."started_at" IS '开始学习时间';
COMMENT ON COLUMN "course_enrollments"."updated_at" IS '学习记录更新时间';
COMMENT ON COLUMN "course_enrollments"."completed_at" IS '完成全部步骤时间';
COMMENT ON COLUMN "course_step_progress"."id" IS '步骤进度主键';
COMMENT ON COLUMN "course_step_progress"."enrollment_id" IS '所属课程注册标识';
COMMENT ON COLUMN "course_step_progress"."step_key" IS '跨版本稳定步骤键';
COMMENT ON COLUMN "course_step_progress"."operation_id" IS '客户端操作幂等键';
COMMENT ON COLUMN "course_step_progress"."completed_at" IS '步骤完成时间';
COMMENT ON COLUMN "course_exercise_attempts"."id" IS '练习作答主键';
COMMENT ON COLUMN "course_exercise_attempts"."enrollment_id" IS '所属课程注册标识';
COMMENT ON COLUMN "course_exercise_attempts"."exercise_key" IS '练习稳定键';
COMMENT ON COLUMN "course_exercise_attempts"."selected_option_id" IS '学员选择的选项键';
COMMENT ON COLUMN "course_exercise_attempts"."correct" IS '服务端判定结果';
COMMENT ON COLUMN "course_exercise_attempts"."operation_id" IS '客户端作答幂等键';
COMMENT ON COLUMN "course_exercise_attempts"."created_at" IS '作答提交时间';
COMMENT ON COLUMN "course_feedback"."id" IS '课程评价主键';
COMMENT ON COLUMN "course_feedback"."enrollment_id" IS '所属课程注册标识';
COMMENT ON COLUMN "course_feedback"."usefulness" IS '内容实用性评分';
COMMENT ON COLUMN "course_feedback"."clarity" IS '表达清晰度评分';
COMMENT ON COLUMN "course_feedback"."difficulty" IS '难度适合度评分';
COMMENT ON COLUMN "course_feedback"."recommendation" IS '推荐意愿评分';
COMMENT ON COLUMN "course_feedback"."most_helpful_lesson_key" IS '最有帮助的小节稳定键';
COMMENT ON COLUMN "course_feedback"."comment" IS '学员补充意见';
COMMENT ON COLUMN "course_feedback"."created_at" IS '评价创建时间';
COMMENT ON COLUMN "course_feedback"."updated_at" IS '评价更新时间';

COMMENT ON CONSTRAINT "course_enrollments_pkey" ON "course_enrollments" IS '课程注册主键约束';
COMMENT ON CONSTRAINT "course_step_progress_pkey" ON "course_step_progress" IS '课程步骤进度主键约束';
COMMENT ON CONSTRAINT "course_exercise_attempts_pkey" ON "course_exercise_attempts" IS '课程练习作答主键约束';
COMMENT ON CONSTRAINT "course_exercise_attempts_option_check" ON "course_exercise_attempts" IS '练习选项只能为 a 至 d';
COMMENT ON CONSTRAINT "course_feedback_pkey" ON "course_feedback" IS '课程反馈主键约束';
COMMENT ON CONSTRAINT "course_feedback_scores_check" ON "course_feedback" IS '课程反馈各维度仅允许 1 至 5 分';
COMMENT ON CONSTRAINT "course_enrollments_user_id_fkey" ON "course_enrollments" IS '课程注册归属员工外键';
COMMENT ON CONSTRAINT "course_step_progress_enrollment_id_fkey" ON "course_step_progress" IS '步骤进度归属课程注册外键';
COMMENT ON CONSTRAINT "course_exercise_attempts_enrollment_id_fkey" ON "course_exercise_attempts" IS '练习作答归属课程注册外键';
COMMENT ON CONSTRAINT "course_feedback_enrollment_id_fkey" ON "course_feedback" IS '课程反馈归属课程注册外键';
COMMENT ON INDEX "course_enrollments_user_id_status_updated_at_idx" IS '按员工与状态读取最近学习记录';
COMMENT ON INDEX "course_enrollments_user_id_course_slug_course_version_key" IS '同一员工课程版本唯一注册';
COMMENT ON INDEX "course_enrollments_user_id_idempotency_key_key" IS '课程注册请求幂等约束';
COMMENT ON INDEX "course_step_progress_enrollment_id_completed_at_idx" IS '按课程注册读取步骤完成记录';
COMMENT ON INDEX "course_step_progress_enrollment_id_step_key_key" IS '同一课程步骤仅完成一次';
COMMENT ON INDEX "course_step_progress_enrollment_id_operation_id_key" IS '步骤完成请求幂等约束';
COMMENT ON INDEX "course_exercise_attempts_enrollment_id_exercise_key_created_at_idx" IS '按课程练习读取作答历史';
COMMENT ON INDEX "course_exercise_attempts_enrollment_id_operation_id_key" IS '练习作答请求幂等约束';
COMMENT ON INDEX "course_attempt_answer_key" IS '同一选项的重复练习作答去重';
COMMENT ON INDEX "course_feedback_enrollment_id_key" IS '每个课程注册只保存一份反馈';
