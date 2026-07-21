# 云服务架构

## 边界

Orosaga 是公司内部单租户知识门户，不承载外部 GEO、投放或报告系统的业务逻辑，只发布治理后的 HTTPS 入口。飞书是身份、组织主数据和 Wiki 正文权限源；Orosaga 只保存登录映射、门户扩展资料与目录元数据。

## 运行拓扑

生产域名为 `orosaga.wanhuchangan.com`。ALB 将 HTTPS 流量分发到两个可用区的相同 Web/API 容器；Web 由 Nginx 提供，API 连接 RDS PostgreSQL 16。Worker 可运行两份，通过 PostgreSQL advisory lock 保证同类同步单实例执行。

私有 OSS 保存头像与编辑器图片。KMS 保存飞书 App Secret、数据库凭据和会话密钥。SLS 收集结构化日志和告警；日志仅包含 request ID 和非敏感上下文。

浏览器先经过会话授权请求资产 API，再获得有效期 300 秒的 OSS V4 签名地址。OSS 凭据仅存在于 API 运行环境，由 KMS 注入，不进入浏览器。飞书同步使用官方 Node SDK 的企业自建应用身份，不依赖个人 `lark-cli`。

## 数据一致性

内容保存使用乐观锁：请求携带当前版本，事务内创建不可变 revision 后切换当前版本；冲突返回 `409 VERSION_CONFLICT`。回滚创建新版本，不删除历史。

Wiki 每棵来源树先完整拉入内存快照，成功后才在事务中切换；失败继续使用上一份成功数据。营地 UUID 与 `CAMP-*` 编号稳定，节点 token 只作外部唯一键。

## 环境隔离

development、staging、production 使用独立数据库、飞书应用配置、OSS 前缀和 KMS secret。artifact 只构建一次，staging 验证通过后以同一 commit SHA 提升到 production。
