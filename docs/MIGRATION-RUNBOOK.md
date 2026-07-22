# 数据迁移运行手册

## 切换前

1. 确认同一个飞书企业自建应用已发布正式版本，redirect URI 精确配置为生产 callback。
2. 只申请用户身份、通讯录基础信息与 Wiki 只读权限，并把应用加入目标知识空间。
3. 把凭据写入服务器 root-only 环境文件并设为 `0600`，检查仓库、镜像、构建参数和日志中不存在密钥；稳定后迁移 KMS。
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

1. 运行 `ops:configure-feishu`，从根节点解析真实 space ID，并把旧标题排除项唯一转换为明确节点 token。
2. 手工触发组织同步，核对姓名、部门层级、在职状态；确认扩展简介未被覆盖。
3. 手工触发 Wiki 同步，核对移动、改名、分页和软删除。
4. 对账 `legacy_descendant_count` 与 `document_count`，记录差异原因。
5. 核对现有节点和营地已归属真实知识源，UUID 与 `CAMP-*` 编号未变化；连续执行两次，第二次不得产生重复用户、节点或编号。

## 灰度与回退

按技术/运营小组、10%、50%、100% 放量。旧站保留只读至少两周。出现 SSO 故障、越权、内容错配、核心页不可用或持续 5xx，立即把 Nginx 精确域名切到503维护页，并将 `/opt/orosaga/current` 回退到上一 release；新数据库只停止新版本写入，不执行破坏性降级。
