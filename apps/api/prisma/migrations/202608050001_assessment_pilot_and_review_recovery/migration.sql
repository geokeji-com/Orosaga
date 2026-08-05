-- CreateEnum
CREATE TYPE "AssessmentAttemptKind" AS ENUM ('FORMAL', 'PILOT');

-- AlterTable
ALTER TABLE "assessment_attempts"
  ADD COLUMN "kind" "AssessmentAttemptKind" NOT NULL DEFAULT 'FORMAL';

-- Existing formal limits must not count pre-publication pilot attempts.
DROP INDEX "assessment_attempts_effective_number_key";
DROP INDEX "assessment_attempts_one_effective_per_day";
CREATE UNIQUE INDEX "assessment_attempts_effective_number_key"
  ON "assessment_attempts"("user_id", "cycle_id", "attempt_number")
  WHERE "status" <> 'VOIDED' AND "kind" = 'FORMAL';
CREATE UNIQUE INDEX "assessment_attempts_one_effective_per_day"
  ON "assessment_attempts"("user_id", "assessment_id", "quota_date")
  WHERE "status" <> 'VOIDED' AND "kind" = 'FORMAL';
CREATE UNIQUE INDEX "assessment_attempts_one_pilot_per_version"
  ON "assessment_attempts"("user_id", "version_id")
  WHERE "kind" = 'PILOT';

-- CreateTable
CREATE TABLE "assessment_pilot_participants" (
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "granted_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoked_by_id" UUID,
    CONSTRAINT "assessment_pilot_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_pilot_participants_version_id_user_id_key"
  ON "assessment_pilot_participants"("version_id", "user_id");
CREATE INDEX "assessment_pilot_participants_user_id_revoked_at_idx"
  ON "assessment_pilot_participants"("user_id", "revoked_at");

-- AddForeignKey
ALTER TABLE "assessment_pilot_participants"
  ADD CONSTRAINT "assessment_pilot_participants_version_id_fkey"
  FOREIGN KEY ("version_id") REFERENCES "assessment_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_pilot_participants"
  ADD CONSTRAINT "assessment_pilot_participants_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_pilot_participants"
  ADD CONSTRAINT "assessment_pilot_participants_granted_by_id_fkey"
  FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_pilot_participants"
  ADD CONSTRAINT "assessment_pilot_participants_revoked_by_id_fkey"
  FOREIGN KEY ("revoked_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Documentation
COMMENT ON TYPE "AssessmentAttemptKind" IS '正式认证或受控预发布试测的考试类别';
COMMENT ON COLUMN "assessment_attempts"."kind" IS '正式认证或受控预发布试测';
COMMENT ON TABLE "assessment_pilot_participants" IS '仅用于发布前代表性新人试测的受控参与者名单';
COMMENT ON COLUMN "assessment_pilot_participants"."id" IS '参与资格稳定标识';
COMMENT ON COLUMN "assessment_pilot_participants"."version_id" IS '对应的未发布题库版本';
COMMENT ON COLUMN "assessment_pilot_participants"."user_id" IS '被授权的内部员工';
COMMENT ON COLUMN "assessment_pilot_participants"."granted_by_id" IS '授权管理员';
COMMENT ON COLUMN "assessment_pilot_participants"."created_at" IS '授权时间';
COMMENT ON COLUMN "assessment_pilot_participants"."revoked_at" IS '撤销时间；为空表示仍可试测';
COMMENT ON COLUMN "assessment_pilot_participants"."revoked_by_id" IS '撤销管理员';
