# 数据迁移运行手册

## 切换前

1. 确认飞书企业自建应用已发布，redirect URI 精确配置为生产 callback。
2. 只申请用户身份、通讯录基础信息与 Wiki 只读权限，并把应用加入目标知识空间。
3. 把 KMS secret 注入 API/Worker，检查镜像和日志中不存在密钥。
4. 将 `seed/private/team` 的 31 张盘点图片上传私有 OSS，核对 hash、MIME 和大小。
5. 为 `localhost:3302` 指定真实 HTTPS 域名；裸 IP 报告系统在取得 HTTPS 域名前保持禁用。

## 数据库与基线

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

种子任务从 `seed/legacy` 读取本地原型。预期对账：30 个员工扩展资料、31 个盘点资产、16 个营地、旧口径后代节点合计 253、7 个系统入口、6 个工作流阶段、18 项完成标准。两条不安全系统入口必须是 disabled。

SQL 注释门禁：

```bash
npm run check:sql-comments
```

## 飞书首次同步

1. 在后台配置真实 knowledge source 的 space ID、根节点 token 和明确排除 token。
2. 手工触发组织同步，核对姓名、部门层级、在职状态；确认扩展简介未被覆盖。
3. 手工触发 Wiki 同步，核对移动、改名、分页和软删除。
4. 对账 `legacy_descendant_count` 与 `document_count`，记录差异原因。
5. 连续执行两次，第二次必须不产生重复用户、节点或营地编号。

## 灰度与回退

按技术/运营小组、10%、50%、100% 放量。旧站保留只读至少两周。出现 SSO 故障、越权、内容错配、核心页不可用或持续 5xx，立即将 ALB 切回旧站；新数据库只停止写入，不执行破坏性降级。
