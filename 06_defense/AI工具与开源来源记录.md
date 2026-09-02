# AI 工具与开源来源记录

## AI 使用与人工复核

项目使用 AI 编码助手辅助仓库检索、测试建议、文档整理和部署配置检查。AI 输出不直接作为验收结论：代码由成员阅读，测试由本地命令或 GitHub Actions 实际执行，无法验证的外部环境项目必须明确标记。

人工复核包括业务规则、鉴权边界、测试真实性、文档与代码版本一致性、导出文件可打开性以及凭据扫描。重要代码仍应通过 Pull Request 由非作者组员评审。

## 开源依赖与来源

| 软件 | 用途 | 许可证/来源入口 |
| --- | --- | --- |
| React、Vite、Ant Design | 前端与构建 | `frontend/package-lock.json`，MIT |
| Express、Sequelize | HTTP 服务与 ORM | `backend/package-lock.json`，MIT |
| Playwright | 浏览器测试和 PDF 验证 | `frontend/package-lock.json`，Apache-2.0 |
| MySQL Community | 数据库 | `03_devops/docker-compose.yml`，GPL-2.0 |
| Kubernetes/kind | 集群验证 | `03_devops/k8s/`，Apache-2.0 |
| Pandoc | DOCX/HTML 导出 | `automation/export-deliverables.js`，GPL-2.0-or-later |

完整 JavaScript 依赖版本和完整性哈希以各目录 `package-lock.json` 为准。演示图片最终公开发布前仍需由负责人逐项确认来源和授权范围。
