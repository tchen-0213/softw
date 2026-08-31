# 03_devops DevOps 交付物

| 类别 | 位置 |
| --- | --- |
| 单体 Compose | `docker-compose.yml` |
| 微服务 Compose | `docker-compose.microservices.yml` |
| 数据库初始化 | `database/init/001_database.sql` |
| 版本化数据库迁移 | `../backend/database/migrations/`、`../backend/scripts/migrate.js` |
| Nginx 配置 | `docker/nginx/default.conf` |
| Kubernetes | `k8s/monolith/`、`k8s/microservices/`、`k8s/experiments/` |
| 运维脚本 | `scripts/` |
| 部署说明 | `部署文档.md` |
| GitHub CI/CD | `../.github/workflows/ci-cd.yml` |
| CI/CD 验证记录 | `2026-08-25-CI-CD验证记录.md` |
| 微服务 Kubernetes 实测记录 | `2026-08-27-微服务Kubernetes验证记录.md` |
| 微服务自动部署与可观测性 | `2026-08-28-微服务自动部署与可观测性验证记录.md` |
| D6-01 三业务微服务验收记录 | `2026-08-30-D6-01三业务微服务验收记录.md` |
| D6-02 公开 API 与网关回归记录 | `2026-08-31-D6-02微服务全量回归验收记录.md` |
| D7-01 CI/CD、部署诊断与回滚 | `2026-08-31-D7-01-CI-CD部署与回滚验收记录.md` |
| Pages + Codespaces 公网验证 | `2026-08-27-GitHub-Pages-Codespaces联通验证记录.md` |
| Codespaces 启动 | `scripts/codespace-start.sh`、`../.devcontainer/devcontainer.json` |
| 流水线截图 | `../05_management/流水线截图/` |

Dockerfile 需要与构建上下文一起使用，因此保留在 `../backend/`、`../frontend/` 和 `../services/*/`。GitHub Actions 工作流必须位于 `.github/workflows/` 才能被平台识别。

常用命令应在仓库根目录执行：

```bash
sh 03_devops/scripts/init-local-env.sh
npm run compose:up
npm run compose:down
docker compose --env-file .env -f 03_devops/docker-compose.microservices.yml up -d --build --wait
npm run test:services:inventory
npm run test:services:api
npm run k8s:observe
IMAGE_TAG=$(git rev-parse HEAD)
sh 03_devops/scripts/build-local-images.sh softw "$IMAGE_TAG"
npm run k8s:deploy -- softw "$IMAGE_TAG"
npm run k8s:rollback -- softw-microservices product-service
npm run perf:compare
npm run experiment:hpa
npm run experiment:fault
```

Compose 从仓库根目录下被 Git 忽略的 `.env` 读取运行密钥。Kubernetes 部署前还需把同一组环境变量
载入当前 shell，并执行 `sh 03_devops/scripts/create-k8s-secrets.sh`；密钥值不会写入 YAML。

CI 的七镜像构建只发布 `${GITHUB_SHA}` 标签，不发布 `latest`。本地构建和部署同样拒绝 `latest` 与
`practice`，以保证部署、健康检查和回滚证据能追溯到唯一提交。部署成功和失败的原始状态统一保存在
`kubernetes-deployment-${GITHUB_SHA}` Actions 工件中。

微服务版本启动后，前端位于 `http://localhost:8082`，网关健康检查位于 `http://localhost:8081/health`。用户、商品交易和订单服务分别管理 `softw_users`、`softw_catalog`、`softw_orders`，完整边界和接口见 `../02_docs/微服务接口与数据归属.md`。

公网演示使用 GitHub Pages 前端 `https://tchen-0213.github.io/softw/` 和 Codespaces 单体后端 `https://softw-defense-demo-5gp6vp6vgjwghv95q-3001.app.github.dev`。Pages 通过仓库变量 `CODESPACE_API_BASE_URL` 获取后端 `/api` 地址；Codespaces 的 3001 端口必须设为 Public。完整启动和恢复步骤见 `部署文档.md`。

全新数据库会在后端启动时自动迁移。也可以显式检查：

```bash
docker compose --env-file .env -f 03_devops/docker-compose.yml exec backend npm run db:migrate:status
```
