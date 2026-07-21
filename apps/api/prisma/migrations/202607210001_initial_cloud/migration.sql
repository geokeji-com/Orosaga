-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Search Chinese titles, summaries, names and tags without a separate cluster.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "SyncKind" AS ENUM ('ORGANIZATION', 'WIKI');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "open_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "csrf_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "department_id" UUID,
    "bio" TEXT NOT NULL DEFAULT '',
    "portal_title" TEXT NOT NULL DEFAULT '',
    "consult_topics" JSONB NOT NULL DEFAULT '[]',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "avatar_asset_id" UUID,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_pages" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "page_type" TEXT NOT NULL,
    "current_revision_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_revisions" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "change_summary" TEXT NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_items" (
    "id" UUID NOT NULL,
    "parent_id" UUID,
    "label" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "icon_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "navigation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_stages" (
    "id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "workflow_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_items" (
    "id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "item_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "workflow_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_link_groups" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "system_link_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_links" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "minimum_role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "icon_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "system_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "object_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "owner_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_sources" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "root_node_token" TEXT NOT NULL,
    "excluded_tokens" JSONB NOT NULL DEFAULT '[]',
    "interval_mins" INTEGER NOT NULL DEFAULT 30,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "last_success_at" TIMESTAMP(3),

    CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wiki_nodes" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "external_node_token" TEXT NOT NULL,
    "parent_node_token" TEXT,
    "title" TEXT NOT NULL,
    "node_type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "author_metadata" JSONB,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "wiki_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camps" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "root_node_id" UUID NOT NULL,
    "display_code" TEXT NOT NULL,
    "legacy_descendant_count" INTEGER NOT NULL DEFAULT 0,
    "document_count" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "camps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" UUID NOT NULL,
    "kind" "SyncKind" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "discovered" INTEGER NOT NULL DEFAULT 0,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "soft_deleted" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_revisions" (
    "id" UUID NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "actor_id" UUID NOT NULL,
    "change_summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "ip_address" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_open_id_key" ON "users"("open_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_revoked_at_idx" ON "sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "departments_external_id_key" ON "departments"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_user_id_key" ON "employee_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_pages_slug_key" ON "content_pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "content_pages_current_revision_id_key" ON "content_pages"("current_revision_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_revisions_page_id_version_key" ON "content_revisions"("page_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_slug_key" ON "workflow_definitions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_stages_workflow_id_sort_order_key" ON "workflow_stages"("workflow_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_items_stage_id_item_type_sort_order_key" ON "workflow_items"("stage_id", "item_type", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "assets_object_key_key" ON "assets"("object_key");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_sources_space_id_root_node_token_key" ON "knowledge_sources"("space_id", "root_node_token");

-- CreateIndex
CREATE UNIQUE INDEX "wiki_nodes_external_node_token_key" ON "wiki_nodes"("external_node_token");

-- CreateIndex
CREATE INDEX "wiki_nodes_source_id_parent_node_token_idx" ON "wiki_nodes"("source_id", "parent_node_token");

-- CreateIndex
CREATE UNIQUE INDEX "camps_root_node_id_key" ON "camps"("root_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "camps_display_code_key" ON "camps"("display_code");

-- CreateIndex
CREATE INDEX "sync_runs_kind_started_at_idx" ON "sync_runs"("kind", "started_at");

-- CreateIndex
CREATE INDEX "resource_revisions_resource_type_resource_id_created_at_idx" ON "resource_revisions"("resource_type", "resource_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "resource_revisions_resource_type_resource_id_version_key" ON "resource_revisions"("resource_type", "resource_id", "version");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_created_at_idx" ON "audit_logs"("resource_type", "resource_id", "created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_avatar_asset_id_fkey" FOREIGN KEY ("avatar_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_pages" ADD CONSTRAINT "content_pages_current_revision_id_fkey" FOREIGN KEY ("current_revision_id") REFERENCES "content_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "content_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "navigation_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_stages" ADD CONSTRAINT "workflow_stages_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_items" ADD CONSTRAINT "workflow_items_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "workflow_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_links" ADD CONSTRAINT "system_links_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "system_link_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_nodes" ADD CONSTRAINT "wiki_nodes_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camps" ADD CONSTRAINT "camps_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camps" ADD CONSTRAINT "camps_root_node_id_fkey" FOREIGN KEY ("root_node_id") REFERENCES "wiki_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Table and column comments are a release gate for all new persistence fields.
COMMENT ON TABLE "users" IS '飞书同步的内部用户';
COMMENT ON COLUMN "users"."id" IS '内部稳定标识';
COMMENT ON COLUMN "users"."open_id" IS '当前飞书应用内外部标识';
COMMENT ON COLUMN "users"."display_name" IS '门户显示名';
COMMENT ON COLUMN "users"."role" IS '本地授权角色';
COMMENT ON COLUMN "users"."status" IS '在职状态';
COMMENT ON COLUMN "users"."created_at" IS '创建时间';
COMMENT ON COLUMN "users"."updated_at" IS '更新时间';
COMMENT ON TABLE "sessions" IS '服务端登录会话摘要';
COMMENT ON COLUMN "sessions"."id" IS '会话标识';
COMMENT ON COLUMN "sessions"."user_id" IS '所属用户';
COMMENT ON COLUMN "sessions"."token_hash" IS '随机令牌摘要';
COMMENT ON COLUMN "sessions"."csrf_hash" IS 'CSRF令牌摘要';
COMMENT ON COLUMN "sessions"."expires_at" IS '绝对过期时间';
COMMENT ON COLUMN "sessions"."revoked_at" IS '主动撤销时间';
COMMENT ON COLUMN "sessions"."created_at" IS '创建时间';
COMMENT ON COLUMN "sessions"."last_seen_at" IS '最后使用时间';
COMMENT ON TABLE "departments" IS '飞书部门镜像';
COMMENT ON COLUMN "departments"."id" IS '内部稳定标识';
COMMENT ON COLUMN "departments"."external_id" IS '飞书部门标识';
COMMENT ON COLUMN "departments"."name" IS '部门名称';
COMMENT ON COLUMN "departments"."parent_id" IS '父部门内部标识';
COMMENT ON COLUMN "departments"."active" IS '是否仍有效';
COMMENT ON COLUMN "departments"."updated_at" IS '同步更新时间';
COMMENT ON TABLE "employee_profiles" IS '门户维护的员工扩展资料';
COMMENT ON COLUMN "employee_profiles"."id" IS '内部稳定标识';
COMMENT ON COLUMN "employee_profiles"."user_id" IS '一对一用户标识';
COMMENT ON COLUMN "employee_profiles"."department_id" IS '当前所属部门';
COMMENT ON COLUMN "employee_profiles"."bio" IS '门户简介';
COMMENT ON COLUMN "employee_profiles"."portal_title" IS '门户展示职能称谓';
COMMENT ON COLUMN "employee_profiles"."consult_topics" IS '可咨询事项列表';
COMMENT ON COLUMN "employee_profiles"."tags" IS '协作标签列表';
COMMENT ON COLUMN "employee_profiles"."avatar_asset_id" IS '私有头像资产标识';
COMMENT ON COLUMN "employee_profiles"."visible" IS '是否在组织页展示';
COMMENT ON COLUMN "employee_profiles"."version" IS '扩展资料乐观锁版本';
COMMENT ON COLUMN "employee_profiles"."updated_at" IS '更新时间';
COMMENT ON TABLE "content_pages" IS '可发布的公司与首页内容';
COMMENT ON COLUMN "content_pages"."id" IS '页面稳定标识';
COMMENT ON COLUMN "content_pages"."slug" IS '路由唯一键';
COMMENT ON COLUMN "content_pages"."page_type" IS '受控页面类型';
COMMENT ON COLUMN "content_pages"."current_revision_id" IS '当前不可变版本标识';
COMMENT ON COLUMN "content_pages"."version" IS '乐观锁版本号';
COMMENT ON COLUMN "content_pages"."updated_at" IS '更新时间';
COMMENT ON TABLE "content_revisions" IS '页面不可变历史版本';
COMMENT ON COLUMN "content_revisions"."id" IS '历史版本标识';
COMMENT ON COLUMN "content_revisions"."page_id" IS '所属页面';
COMMENT ON COLUMN "content_revisions"."version" IS '页面内递增版本号';
COMMENT ON COLUMN "content_revisions"."payload" IS '经schema校验的结构化内容';
COMMENT ON COLUMN "content_revisions"."change_summary" IS '变更摘要';
COMMENT ON COLUMN "content_revisions"."actor_id" IS '操作者';
COMMENT ON COLUMN "content_revisions"."actor_ip" IS '客户端IP';
COMMENT ON COLUMN "content_revisions"."created_at" IS '创建时间';
COMMENT ON TABLE "navigation_items" IS '受控导航树节点';
COMMENT ON COLUMN "navigation_items"."id" IS '导航标识';
COMMENT ON COLUMN "navigation_items"."parent_id" IS '父节点标识';
COMMENT ON COLUMN "navigation_items"."label" IS '显示标题';
COMMENT ON COLUMN "navigation_items"."route" IS '站内路由';
COMMENT ON COLUMN "navigation_items"."icon_key" IS '图标白名单键';
COMMENT ON COLUMN "navigation_items"."sort_order" IS '同层排序值';
COMMENT ON COLUMN "navigation_items"."enabled" IS '是否启用';
COMMENT ON TABLE "workflow_definitions" IS '可发布工作流定义';
COMMENT ON COLUMN "workflow_definitions"."id" IS '工作流标识';
COMMENT ON COLUMN "workflow_definitions"."slug" IS '路由唯一键';
COMMENT ON COLUMN "workflow_definitions"."title" IS '工作流标题';
COMMENT ON COLUMN "workflow_definitions"."version" IS '当前版本号';
COMMENT ON COLUMN "workflow_definitions"."updated_at" IS '更新时间';
COMMENT ON TABLE "workflow_stages" IS '工作流阶段及完成标准';
COMMENT ON COLUMN "workflow_stages"."id" IS '阶段标识';
COMMENT ON COLUMN "workflow_stages"."workflow_id" IS '所属工作流';
COMMENT ON COLUMN "workflow_stages"."title" IS '阶段标题';
COMMENT ON COLUMN "workflow_stages"."description" IS '阶段说明';
COMMENT ON COLUMN "workflow_stages"."icon_key" IS '图标白名单键';
COMMENT ON COLUMN "workflow_stages"."sort_order" IS '同层排序值';
COMMENT ON TABLE "workflow_items" IS '工作流阶段结构化条目';
COMMENT ON COLUMN "workflow_items"."id" IS '条目标识';
COMMENT ON COLUMN "workflow_items"."stage_id" IS '所属阶段';
COMMENT ON COLUMN "workflow_items"."item_type" IS '受控条目类型';
COMMENT ON COLUMN "workflow_items"."content" IS '显示内容';
COMMENT ON COLUMN "workflow_items"."sort_order" IS '同层排序值';
COMMENT ON TABLE "system_link_groups" IS '系统入口分组';
COMMENT ON COLUMN "system_link_groups"."id" IS '分组标识';
COMMENT ON COLUMN "system_link_groups"."title" IS '分组标题';
COMMENT ON COLUMN "system_link_groups"."sort_order" IS '同层排序值';
COMMENT ON COLUMN "system_link_groups"."version" IS '当前版本号';
COMMENT ON TABLE "system_links" IS '经过域名白名单治理的外部系统入口';
COMMENT ON COLUMN "system_links"."id" IS '入口标识';
COMMENT ON COLUMN "system_links"."group_id" IS '所属分组';
COMMENT ON COLUMN "system_links"."title" IS '显示标题';
COMMENT ON COLUMN "system_links"."description" IS '入口说明';
COMMENT ON COLUMN "system_links"."url" IS '仅允许HTTPS的目标地址';
COMMENT ON COLUMN "system_links"."environment" IS '目标环境';
COMMENT ON COLUMN "system_links"."minimum_role" IS '最低可见角色';
COMMENT ON COLUMN "system_links"."icon_key" IS '图标白名单键';
COMMENT ON COLUMN "system_links"."enabled" IS '是否启用';
COMMENT ON COLUMN "system_links"."sort_order" IS '同层排序值';
COMMENT ON TABLE "assets" IS '私有OSS对象元数据';
COMMENT ON COLUMN "assets"."id" IS '资产标识';
COMMENT ON COLUMN "assets"."object_key" IS '私有对象键';
COMMENT ON COLUMN "assets"."mime_type" IS 'MIME类型';
COMMENT ON COLUMN "assets"."sha256" IS '内容哈希';
COMMENT ON COLUMN "assets"."size" IS '字节大小';
COMMENT ON COLUMN "assets"."owner_id" IS '所有者用户';
COMMENT ON COLUMN "assets"."created_at" IS '创建时间';
COMMENT ON TABLE "knowledge_sources" IS '飞书知识空间同步配置';
COMMENT ON COLUMN "knowledge_sources"."id" IS '来源标识';
COMMENT ON COLUMN "knowledge_sources"."name" IS '配置名称';
COMMENT ON COLUMN "knowledge_sources"."space_id" IS '飞书知识空间标识';
COMMENT ON COLUMN "knowledge_sources"."root_node_token" IS '根节点token';
COMMENT ON COLUMN "knowledge_sources"."excluded_tokens" IS '明确排除节点token列表';
COMMENT ON COLUMN "knowledge_sources"."interval_mins" IS '同步周期分钟数';
COMMENT ON COLUMN "knowledge_sources"."enabled" IS '是否启用';
COMMENT ON COLUMN "knowledge_sources"."version" IS '配置乐观锁版本';
COMMENT ON COLUMN "knowledge_sources"."last_success_at" IS '最近成功同步时间';
COMMENT ON TABLE "wiki_nodes" IS '飞书Wiki节点元数据镜像';
COMMENT ON COLUMN "wiki_nodes"."id" IS '内部稳定标识';
COMMENT ON COLUMN "wiki_nodes"."source_id" IS '所属知识来源';
COMMENT ON COLUMN "wiki_nodes"."external_node_token" IS '外部节点唯一token';
COMMENT ON COLUMN "wiki_nodes"."parent_node_token" IS '外部父节点token';
COMMENT ON COLUMN "wiki_nodes"."title" IS '节点标题';
COMMENT ON COLUMN "wiki_nodes"."node_type" IS '飞书节点类型';
COMMENT ON COLUMN "wiki_nodes"."url" IS '返回飞书的HTTPS地址';
COMMENT ON COLUMN "wiki_nodes"."author_metadata" IS '飞书作者元数据';
COMMENT ON COLUMN "wiki_nodes"."discovered_at" IS '最近一次发现时间';
COMMENT ON COLUMN "wiki_nodes"."deleted_at" IS '软删除时间';
COMMENT ON TABLE "camps" IS '对应Wiki根节点的稳定营地展示实体';
COMMENT ON COLUMN "camps"."id" IS '内部稳定标识';
COMMENT ON COLUMN "camps"."source_id" IS '所属知识来源';
COMMENT ON COLUMN "camps"."root_node_id" IS '根Wiki节点';
COMMENT ON COLUMN "camps"."display_code" IS '一次性分配的CAMP展示编号';
COMMENT ON COLUMN "camps"."legacy_descendant_count" IS '兼容旧版全部后代计数';
COMMENT ON COLUMN "camps"."document_count" IS '明确文档类型计数';
COMMENT ON COLUMN "camps"."sort_order" IS '首页排序值';
COMMENT ON COLUMN "camps"."enabled" IS '是否展示';
COMMENT ON TABLE "sync_runs" IS '组织或Wiki同步运行记录';
COMMENT ON COLUMN "sync_runs"."id" IS '运行标识';
COMMENT ON COLUMN "sync_runs"."kind" IS '同步类别';
COMMENT ON COLUMN "sync_runs"."status" IS '当前状态';
COMMENT ON COLUMN "sync_runs"."discovered" IS '发现数量';
COMMENT ON COLUMN "sync_runs"."inserted" IS '新增数量';
COMMENT ON COLUMN "sync_runs"."updated" IS '更新数量';
COMMENT ON COLUMN "sync_runs"."soft_deleted" IS '软删数量';
COMMENT ON COLUMN "sync_runs"."skipped" IS '跳过数量';
COMMENT ON COLUMN "sync_runs"."error" IS '错误摘要';
COMMENT ON COLUMN "sync_runs"."started_at" IS '开始时间';
COMMENT ON COLUMN "sync_runs"."finished_at" IS '结束时间';
COMMENT ON TABLE "resource_revisions" IS '结构化资源不可变快照';
COMMENT ON COLUMN "resource_revisions"."id" IS '快照标识';
COMMENT ON COLUMN "resource_revisions"."resource_type" IS '受控资源类型';
COMMENT ON COLUMN "resource_revisions"."resource_id" IS '资源内部标识';
COMMENT ON COLUMN "resource_revisions"."version" IS '资源内递增版本号';
COMMENT ON COLUMN "resource_revisions"."payload" IS '完整结构化快照';
COMMENT ON COLUMN "resource_revisions"."actor_id" IS '操作者';
COMMENT ON COLUMN "resource_revisions"."change_summary" IS '变更摘要';
COMMENT ON COLUMN "resource_revisions"."created_at" IS '创建时间';
COMMENT ON TABLE "audit_logs" IS '安全和内容管理审计日志';
COMMENT ON COLUMN "audit_logs"."id" IS '审计标识';
COMMENT ON COLUMN "audit_logs"."actor_id" IS '可为空的操作者';
COMMENT ON COLUMN "audit_logs"."action" IS '原子操作名';
COMMENT ON COLUMN "audit_logs"."resource_type" IS '目标类型';
COMMENT ON COLUMN "audit_logs"."resource_id" IS '目标标识';
COMMENT ON COLUMN "audit_logs"."ip_address" IS '请求IP';
COMMENT ON COLUMN "audit_logs"."metadata" IS '非敏感审计上下文';
COMMENT ON COLUMN "audit_logs"."created_at" IS '创建时间';

CREATE INDEX "users_display_name_trgm_idx" ON "users" USING GIN ("display_name" gin_trgm_ops);
CREATE INDEX "wiki_nodes_title_trgm_idx" ON "wiki_nodes" USING GIN ("title" gin_trgm_ops) WHERE "deleted_at" IS NULL;
CREATE INDEX "system_links_title_trgm_idx" ON "system_links" USING GIN ("title" gin_trgm_ops) WHERE "enabled" = true;
CREATE INDEX "workflow_definitions_title_trgm_idx" ON "workflow_definitions" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "content_revisions_title_trgm_idx" ON "content_revisions" USING GIN (("payload"->>'title') gin_trgm_ops);
CREATE INDEX "content_revisions_summary_trgm_idx" ON "content_revisions" USING GIN (("payload"->>'summary') gin_trgm_ops);
