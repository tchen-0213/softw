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
| Pages + Codespaces 公网验证 | `2026-08-27-GitHub-Pages-Codespaces联通验证记录.md` |
| Codespaces 启动 | `scripts/codespace-start.sh`、`../.devcontainer/devcontainer.json` |
| 流水线截图 | `../05_management/流水线截图/` |

Dockerfile 需要与构建上下文一起使用，因此保留在 `../backend/`、`../frontend/` 和 `../services/*/`。GitHub Actions 工作流必须位于 `.github/workflows/` 才能被平台识别。

常用命令应在仓库根目录执行：

```bash
npm run compose:up
npm run compose:down
docker compose -f 03_devops/docker-compose.microservices.yml up -d --build --wait
npm run test:services:api
npm run k8s:observe
```

微服务版本启动后，前端位于 `http://localhost:8082`，网关健康检查位于 `http://localhost:8081/health`。用户、商品交易和订单服务分别管理 `softw_users`、`softw_catalog`、`softw_orders`，完整边界和接口见 `../02_docs/微服务接口与数据归属.md`。

公网演示使用 GitHub Pages 前端 `https://tchen-0213.github.io/softw/` 和 Codespaces 单体后端 `https://softw-defense-demo-5gp6vp6vgjwghv95q-3001.app.github.dev`。Pages 通过仓库变量 `CODESPACE_API_BASE_URL` 获取后端 `/api` 地址；Codespaces 的 3001 端口必须设为 Public。完整启动和恢复步骤见 `部署文档.md`。

全新数据库会在后端启动时自动迁移。也可以显式检查：

```bash
docker compose -f 03_devops/docker-compose.yml exec backend npm run db:migrate:status
```
