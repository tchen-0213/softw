# 01_source 代码与仓库清单

本目录作为源代码交付索引。为避免破坏 npm、Docker、Codespaces、GitHub Pages 和 CI/CD 的工作目录约定，实际代码保留在仓库根目录下的可运行位置。

| 代码或配置 | 仓库位置 | 说明 |
| --- | --- | --- |
| 单体后端 | `../backend/` | Express、Sequelize、MySQL 接口服务 |
| 单体前端 | `../frontend/` | React、Vite 页面应用 |
| 微服务版本 | `../services/` | API 网关及用户、商品、订单服务 |
| 仓库级命令 | `../package.json` | 测试、构建、Compose、Kubernetes 和压测入口 |
| 提交用 Word/PDF | `../06_defense/export/` | 给老师直接打开的 `.docx` 与 `.pdf`，先看 `00-请先看这个.txt` |
| CI/CD 工作流 | `../.github/workflows/` | GitHub 规定的流水线固定目录 |
| Codespaces 配置 | `../.devcontainer/` | 自动准备 Docker，并启动后端、MySQL 和容器前端 |

## Git 标签与提交记录

| 标签 | 含义 | 提交 |
| --- | --- | --- |
| `monolith-start` | 改造前原系统基线，不再移动 | `10fa639101b0a64a923599ec27d64262805177a9` |
| `microservices-v1` | 三个业务服务与网关、隔离数据库落地后的对照版本 | `63585e0c9b6cd3b178b61be146c077e98e437dd3` |

远程标签页：https://github.com/tchen-0213/softw/tags

完整提交记录以 Git 历史为准：

```bash
git show --no-patch --decorate monolith-start
git show --no-patch --decorate microservices-v1
git log monolith-start..microservices-v1 --oneline
git show monolith-start --stat
```
