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
| 流水线截图 | `../05_management/流水线截图/` |

Dockerfile 需要与构建上下文一起使用，因此保留在 `../backend/`、`../frontend/` 和 `../services/*/`。GitHub Actions 工作流必须位于 `.github/workflows/` 才能被平台识别。

常用命令应在仓库根目录执行：

```bash
npm run compose:up
npm run compose:down
docker compose -f 03_devops/docker-compose.microservices.yml up --build
```

全新数据库会在后端启动时自动迁移。也可以显式检查：

```bash
docker compose -f 03_devops/docker-compose.yml exec backend npm run db:migrate:status
```
