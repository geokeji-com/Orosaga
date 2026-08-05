-- AlterEnum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ASSESSMENT_MANAGER';

-- Documentation
COMMENT ON TYPE "Role" IS '门户全局角色；题库管理员不继承内容或全局管理权限';
