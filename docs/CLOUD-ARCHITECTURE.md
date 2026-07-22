# 云服务架构

## 边界

Orosaga 是公司内部单租户知识门户，不承载外部 GEO、投放或报告系统的业务逻辑，只发布治理后的 HTTPS 入口。飞书是身份、组织主数据和 Wiki 正文权限源；Orosaga 只保存登录映射、门户扩展资料与目录元数据。

## 运行拓扑

首发域名为 `orosaga.wanhuchangan.com`。服务器 Nginx 终止 TLS，并把这个精确域名反代到仅监听 `127.0.0.1:18088` 的 Web 容器；Web 容器再转发 API。API 连接 RDS PostgreSQL 16 的 `yishan_verse.orosaga`，Worker 通过同一 PostgreSQL 会话持有 advisory lock，保证同类同步单实例执行。

北京地域私有桶 `orosaga` 保存头像与编辑器图片，阻止公共访问。首发密钥位于服务器 root-only 环境文件，KMS 与 SLS 是稳定后的加固项；日志仅允许 request ID 和非敏感上下文。

浏览器经过会话授权请求同源资产 API，API 再从 OSS 内网 Endpoint 获取对象并直接流式返回。OSS 地址和凭据不进入浏览器。飞书登录、组织与 Wiki 同步共用一个企业自建应用的 OAuth 和应用身份，不依赖个人 `lark-cli`。

## 数据一致性

内容保存使用乐观锁：请求携带当前版本，事务内创建不可变 revision 后切换当前版本；冲突返回 `409 VERSION_CONFLICT`。回滚创建新版本，不删除历史。

Wiki 每棵来源树先完整拉入内存快照，成功后才在事务中切换；失败继续使用上一份成功数据。营地 UUID 与 `CAMP-*` 编号稳定，节点 token 只作外部唯一键。

## 环境隔离

本次首发按本机验证、服务器回环验证、HTTPS 域名切换进行手工灰度。独立 staging 数据库、OSS 空间和域名在自动化上线前补齐；后续 CI/CD 对同一 commit SHA 构建一次并逐环境提升，仍共用同一个飞书应用的测试版和正式版。
