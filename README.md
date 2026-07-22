# Orosaga

移山科技内部单租户知识门户。Web 只负责受保护的交互界面；内容、组织、系统入口与飞书 Wiki 元数据由 API、PostgreSQL 和独立同步 Worker 管理。

## 本地启动

要求 Node `24.17.0`、npm `11.6.2` 和 Docker。

```bash
cp .env.example .env
docker compose up --build
```

访问 `http://localhost:8080`。开发环境可在 `.env` 保持 `AUTH_DEV_BYPASS=true`，调用 `POST /auth/dev-login` 建立本地管理员会话；生产环境会强制禁用此入口。

只运行代码层验证：

```bash
npm ci
npm run db:generate
npm run lint
npm run typecheck
npm test
npm run build
npm run check:bundle
```

## 工作区

- `apps/web`：React、React Router、TanStack Query 门户与后台。
- `apps/api`：NestJS REST API、会话、RBAC、版本和审计。
- `apps/worker`：飞书组织与 Wiki 定时同步。
- `packages/contracts`：Web/API 共用的 Zod 契约。
- `packages/config`：环境变量 schema。
- `packages/testing`：测试 fixture。

`npm run db:seed` 只生成不对应真实人员、系统或 Wiki 的开发/测试示例数据；生产环境会拒绝执行。一次性生产迁移资料已从公开仓库当前树移除，受控副本不得再次提交。

## 安全边界

匿名请求只允许不返回内部细节的 `/healthz`、`/readyz`、飞书登录入口和 callback。所有业务 API 需要服务端会话；写请求还需要 CSRF token 与角色校验。系统入口必须为管理员白名单中的 HTTPS 域名。

生产密钥不得进入仓库、镜像、构建参数或日志。首发阶段只写入服务器 root 所有、权限 `0600` 的 `/opt/orosaga/shared/.env.production`；稳定后迁移到 KMS。Web 静态产物由 Nginx 提供，API 与 Worker 作为独立容器运行。

Worker 使用同一个飞书企业自建应用的应用身份同步组织和 Wiki，不依赖个人 `lark-cli`。生产头像由 API 从北京地域私有 OSS 内网流式读取并同源返回，浏览器不会收到 OSS 地址或凭据；开发/测试如需本地图片，必须显式设置仓库外的 `PRIVATE_ASSET_ROOT`。

详细说明见 [架构说明](docs/CLOUD-ARCHITECTURE.md)、[迁移运行手册](docs/MIGRATION-RUNBOOK.md)、[生产运行手册](docs/OPERATIONS.md) 和 [首发部署手册](docs/PRODUCTION-DEPLOYMENT.md)。
