# 生产发布、健康检查与回退

## 固定边界

- 域名：`orosaga.wanhuchangan.com`。
- 发布目录：`/opt/orosaga/releases/<commit-sha>`，当前版本由 `/opt/orosaga/current` 指向。
- 生产主环境文件：`/opt/orosaga/shared/.env.production`，root 所有，权限 `0600`，只用于生成职责分离的 `api.env`、`worker.env`、`database.env` 和 `operations.env`；运行容器不得共享全量环境。
- Web 仅监听宿主机 `127.0.0.1:18088`；API、Worker 不发布宿主机端口。
- 数据库仅使用 `yishan_verse` 的 `orosaga` schema；生产不使用 Redis。
- 数据库仅通过同 VPC RDS 内网地址访问，显式使用 `sslmode=disable`；RDS 不开放公网地址，白名单只允许 Orosaga ECS 私网来源。
- 禁止执行 `docker system prune`、`docker image prune -a`、`docker compose down -v`。

环境职责固定为：`database.env` 只含 `DATABASE_URL` 和 `DATABASE_ALLOW_PLAINTEXT_INTERNAL=true`；`worker.env` 只含数据库连接、明文内网授权、飞书应用身份、API/Wiki host 和同步周期；`api.env` 包含数据库连接、明文内网授权、API 会话、飞书登录和 OSS 只读访问；`operations.env` 只供一次性任务使用，可包含数据库连接、明文内网授权、上传写权限、Wiki 根节点和管理员初始化参数。四个文件均为 root:root/0600。

## 首次发布顺序

在 release 目录中固定提交标签：

```bash
export OROSAGA_RELEASE_SHA='<commit-sha>'
export OROSAGA_API_ENV_FILE='/opt/orosaga/shared/api.env'
export OROSAGA_WORKER_ENV_FILE='/opt/orosaga/shared/worker.env'
export OROSAGA_DATABASE_ENV_FILE='/opt/orosaga/shared/database.env'
export OROSAGA_OPERATIONS_ENV_FILE='/opt/orosaga/shared/operations.env'
export OROSAGA_COMPOSE='docker compose -f docker-compose.production.yml'
printf '%s\n' "$OROSAGA_RELEASE_SHA" > RELEASE_SHA
```

先验证 Compose 并按顺序构建，避免共享服务器磁盘和内存瞬时放大：

```bash
$OROSAGA_COMPOSE config >/dev/null
$OROSAGA_COMPOSE build api
$OROSAGA_COMPOSE build worker
$OROSAGA_COMPOSE build web
```

若中国区服务器无法连接 Docker Hub，可先运行 `deploy/build-node-base.sh`：脚本从华为云 Node 镜像下载官方 Linux x64 归档并校验固定 SHA-256，同时下载 npm `11.6.2` 官方归档并校验固定 SHA-1，随后构建 `orosaga-node:24.17.0` 并验证 Node/npm 版本。设置 `OROSAGA_NODE_IMAGE=orosaga-node:24.17.0` 后再构建应用；CI 仍使用默认官方镜像。任何代理 Nginx 基础镜像只允许回环灰度，必须记录 digest，正式域名切换前恢复并验证官方固定版本。

数据库写入前必须创建手工物理备份，等待 `BackupStatus=Success`，并记录快照 ID、恢复负责人、验证时间和当前 PITR 状态；缺少成功快照立即停止。本次共享 RDS 的 PITR 保持关闭，不修改实例级策略。只读预检会拒绝未显式授权的明文连接、非 `disable` 模式、非阿里云 RDS 主机名以及任何解析到公网的地址。migration 命令自身也会先执行同一预检；迁移后再次强制检查 schema：

```bash
$OROSAGA_COMPOSE --profile operations run --rm migrate \
  node apps/api/dist/cli/preflight.js
$OROSAGA_COMPOSE --profile operations run --rm migrate
$OROSAGA_COMPOSE --profile operations run --rm migrate \
  node apps/api/dist/cli/preflight.js --require-schema
```

只有首次导入旧数据时才运行 seed。seed 会重建工作流阶段，后续发布禁止重复执行：

```bash
$OROSAGA_COMPOSE --profile operations run --rm seed
```

上传并逐对象校验头像。服务器使用 OSS 内网 Endpoint；匿名校验使用公网域名：

```bash
$OROSAGA_COMPOSE --profile operations run --rm \
  -e OSS_UPLOAD_ENDPOINT=oss-cn-beijing-internal.aliyuncs.com \
  ops node apps/api/dist/cli/upload-avatars.js
```

飞书应用权限与 Wiki 可见范围生效后，配置真实知识源，再启动 Worker 完成全量同步：

```bash
$OROSAGA_COMPOSE --profile operations run --rm \
  ops node apps/api/dist/cli/configure-feishu-source.js
$OROSAGA_COMPOSE up -d api worker
```

组织同步成功且姓名唯一后，初始化管理员；姓名只来自 root-only 环境变量，脚本最终按内部 UUID 修改角色：

```bash
$OROSAGA_COMPOSE --profile operations run --rm \
  ops node apps/api/dist/cli/bootstrap-admins.js
$OROSAGA_COMPOSE up -d web
```

同步、管理员初始化和头像上传全部完成后执行生产对账；任何数量不一致都会以非零状态退出：

```bash
$OROSAGA_COMPOSE --profile operations run --rm \
  ops node apps/api/dist/cli/reconcile-production.js
```

回环灰度必须先通过：

```bash
curl --fail --silent --show-error http://127.0.0.1:18088/healthz
curl --silent --output /dev/null --write-out '%{http_code}\n' \
  http://127.0.0.1:18088/api/v1/navigation
$OROSAGA_COMPOSE ps
$OROSAGA_COMPOSE logs --since 10m api worker web
```

匿名业务 API 应返回 `401`。生产对账的活动员工数来自最近一次60分钟内成功组织同步的 `discovered`，30只表示旧员工扩展资料迁移基线。完成数据对账后再安装 Nginx 精确域名配置和 TLS 证书。

## 证书与域名

`publish.wanhuchangan.com` 的 vhost、证书和私钥是禁止修改的保护对象。每次 Nginx 变更前后必须运行 `deploy/verify-publish-protection.sh`，任意 hash 不一致立即停止。先把 `deploy/nginx/orosaga-http.conf` 安装为独立的 `/etc/nginx/conf.d/orosaga.wanhuchangan.com.conf` 并通过 `nginx -t`；该配置除 ACME challenge 外只返回 Orosaga 503。再使用现有 acme.sh 的 `/var/www/acme` webroot只签发 Orosaga 域名，证书只能通过 `--install-cert` 安装到 Orosaga 独立目录：

```bash
acme.sh --issue --server letsencrypt --keylength ec-256 \
  -d orosaga.wanhuchangan.com -w /var/www/acme
acme.sh --install-cert --ecc -d orosaga.wanhuchangan.com \
  --key-file /etc/nginx/ssl/orosaga.wanhuchangan.com/privkey.pem \
  --fullchain-file /etc/nginx/ssl/orosaga.wanhuchangan.com/fullchain.pem \
  --reloadcmd 'nginx -t && systemctl reload nginx'
```

随后用 `deploy/nginx/orosaga.conf` 替换同一个 Orosaga 配置文件并安装维护页。不得编辑、复制、续期或覆盖 publish 的配置和证书；reload后必须再次运行保护脚本，并分别验证两个域名的证书 SAN 和页面内容。

## 回退

保留最近两个 release 和三类镜像标签。数据库只允许 expand-contract migration，应用回退不执行降级 SQL。

1. 确认上一 release 的 `RELEASE_SHA` 文件和三类镜像仍存在。
2. 把 `/opt/orosaga/current` 原子切换到上一 release，并执行 `cd /opt/orosaga/current`。
3. 从 `RELEASE_SHA` 重新导出 `OROSAGA_RELEASE_SHA` 和四个环境文件路径。
4. 执行 `docker compose -f docker-compose.production.yml up -d --no-deps api worker web`。
5. 验证回环 `/healthz`、匿名401和容器镜像标签；应用回退不执行数据库降级。
6. 首次上线没有可回退 release 时，让精确域名返回503维护页，不能落到服务器默认站点。

若 expand-contract 迁移本身异常，先停止新版本写入并由数据库负责人根据已记录快照/PITR 在隔离实例验证恢复；不得直接覆盖生产库或执行破坏性降级 SQL。

生产对账成功后，删除服务器 release 下的 `seed/private` 和 `seed/legacy` 副本，并从当前开发分支移除这两类可识别迁移资料；OSS 与数据库是生产事实源。删除前必须核对31个对象和全部业务计数，并保留离线受控迁移源。

## 发布验收

- `/healthz` 只证明进程存活；数据库内网解析、明文授权、schema 和权限以 `ops:preflight` 为准。
- Worker 以组织/Wiki最近成功时间、同步计数和401/403告警作为就绪证据。
- 静态 bundle 扫描不得检出员工姓名、Wiki token、内部地址和头像路径。
- 浏览器不得看到 OSS URL；匿名 OSS HEAD 必须被拒绝。
- GitHub 仓库公开期间，推送前必须通过敏感信息扫描，且不得新增凭据、员工迁移资料、头像或飞书节点 token。
