# 01_source 代码与仓库清单

本目录作为源代码交付索引。为避免破坏 npm、Docker、Railway 和 CI/CD 的工作目录约定，实际代码保留在仓库根目录下的可运行位置。

| 代码或配置 | 仓库位置 | 说明 |
| --- | --- | --- |
| 单体后端 | `../backend/` | Express、Sequelize、MySQL 接口服务 |
| 单体前端 | `../frontend/` | React、Vite 页面应用 |
| 微服务版本 | `../services/` | API 网关及用户、商品、订单服务 |
| 辅助自动化 | `../automation/` | CodeArts 辅助脚本 |
| 仓库级命令 | `../package.json` | 测试、构建、Compose、Kubernetes 和压测入口 |
| CI/CD 工作流 | `../.github/workflows/` | GitHub 规定的流水线固定目录 |

代码基线以 Git 仓库提交和标签为准。原系统对比标签为 `monolith-start`，可用以下命令核对：

```bash
git show monolith-start --stat
```
