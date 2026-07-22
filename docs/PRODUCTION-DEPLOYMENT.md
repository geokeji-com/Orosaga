# 生产发布、健康检查与回退

## 固定边界

- 域名：`orosaga.wanhuchangan.com`。
- 发布目录：`/opt/orosaga/releases/<commit-sha>`，当前版本由 `/opt/orosaga/current` 指向。
- 生产环境文件：`/opt/orosaga/shared/.env.production`，root 所有，权限 `0600`。
- Web 仅监听宿主机 `127.0.0.1:18088`；API、Worker 不发布宿主机端口。
- 数据库仅使用 `yishan_verse` 的 `orosaga` schema；生产不使用 Redis。
- 禁止执行 `docker system prune`、`docker image prune -a`、`docker compose down -v`。

## 首次发布顺序

在 release 目录中固定提交标签：

```bash
export OROSAGA_RELEASE_SHA='<commit-sha>'
export OROSAGA_ENV_FILE='/opt/orosaga/shared/.env.production'
export OROSAGA_COMPOSE='docker compose -f docker-compose.production.yml'
```

先验证 Compose 并按顺序构建，避免共享服务器磁盘和内存瞬时放大：

```bash
$OROSAGA_COMPOSE config >/dev/null
$OROSAGA_COMPOSE build api
$OROSAGA_COMPOSE build worker
$OROSAGA_COMPOSE build web
```

数据库预检和 migration 必须在应用启动前完成：

```bash
$OROSAGA_COMPOSE --profile operations run --rm migrate \
  node apps/api/dist/cli/preflight.js
$OROSAGA_COMPOSE --profile operations run --rm migrate
```

只有首次导入旧数据时才运行 seed。seed 会重建工作流阶段，后续发布禁止重复执行：

```bash
$OROSAGA_COMPOSE --profile operations run --rm seed
```

上传并逐对象校验头像。服务器使用 OSS 内网 Endpoint；匿名校验使用公网域名：

```bash
$OROSAGA_COMPOSE --profile operations run --rm \
  -e OSS_UPLOAD_ENDPOINT=oss-cn-beijing-internal.aliyuncs.com \
  seed node apps/api/dist/cli/upload-avatars.js
```

飞书应用权限与 Wiki 可见范围生效后，配置真实知识源，再启动 Worker 完成全量同步：

```bash
$OROSAGA_COMPOSE --profile operations run --rm \
  seed node apps/api/dist/cli/configure-feishu-source.js
$OROSAGA_COMPOSE up -d api worker
```

组织同步成功且姓名唯一后，初始化管理员；姓名只来自 root-only 环境变量，脚本最终按内部 UUID 修改角色：

```bash
$OROSAGA_COMPOSE --profile operations run --rm \
  seed node apps/api/dist/cli/bootstrap-admins.js
$OROSAGA_COMPOSE up -d web
```

同步、管理员初始化和头像上传全部完成后执行生产对账；任何数量不一致都会以非零状态退出：

```bash
$OROSAGA_COMPOSE --profile operations run --rm \
  seed node apps/api/dist/cli/reconcile-production.js
```

回环灰度必须先通过：

```bash
curl --fail --silent --show-error http://127.0.0.1:18088/healthz
curl --silent --output /dev/null --write-out '%{http_code}\n' \
  http://127.0.0.1:18088/api/v1/navigation
$OROSAGA_COMPOSE ps
$OROSAGA_COMPOSE logs --since 10m api worker web
```

匿名业务 API 应返回 `401`。完成数据对账后再安装 Nginx 精确域名配置和 TLS 证书。

## 证书与域名

先安装 `deploy/nginx/orosaga-http.conf` 并通过 `nginx -t`，再使用现有 acme.sh 的 `/var/www/acme` webroot 签发证书。证书只能通过 `--install-cert` 安装：

```bash
acme.sh --issue --server letsencrypt --keylength ec-256 \
  -d orosaga.wanhuchangan.com -w /var/www/acme
acme.sh --install-cert --ecc -d orosaga.wanhuchangan.com \
  --key-file /etc/nginx/ssl/orosaga.wanhuchangan.com/privkey.pem \
  --fullchain-file /etc/nginx/ssl/orosaga.wanhuchangan.com/fullchain.pem \
  --reloadcmd 'nginx -t && systemctl reload nginx'
```

随后安装 `deploy/nginx/orosaga.conf` 和维护页。不得修改其他域名的 vhost。

## 回退

保留最近两个 release 和三类镜像标签。数据库只允许 expand-contract migration，应用回退不执行降级 SQL。

1. 把 `/opt/orosaga/current` 指向上一 release。
2. 从上一 release 读取同一 `OROSAGA_RELEASE_SHA`。
3. 执行 `docker compose up -d --no-deps api worker web`。
4. 验证回环 `/healthz` 和匿名401。
5. 首次上线没有可回退 release 时，让精确域名返回503维护页，不能落到服务器默认站点。

生产对账成功后，删除服务器 release 下的 `seed/private` 和 `seed/legacy` 副本，并从当前开发分支移除这两类可识别迁移资料；OSS 与数据库是生产事实源。删除前必须核对31个对象和全部业务计数，并保留离线受控迁移源。

## 发布验收

- `/healthz` 只证明进程存活；数据库 TLS、schema 和权限以 `ops:preflight` 为准。
- Worker 以组织/Wiki最近成功时间、同步计数和401/403告警作为就绪证据。
- 静态 bundle 扫描不得检出员工姓名、Wiki token、内部地址和头像路径。
- 浏览器不得看到 OSS URL；匿名 OSS HEAD 必须被拒绝。
- GitHub 仓库确认 Private 后才允许推送迁移分支。
