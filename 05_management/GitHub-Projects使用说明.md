# GitHub Projects 使用说明

## 1. 当前管理入口

本项目小学期阶段统一使用 GitHub 管理代码、任务和自动化过程。

| 用途 | 入口 |
| --- | --- |
| 代码仓库 | [tchen-0213/softw](https://github.com/tchen-0213/softw) |
| 任务列表 | [GitHub Issues](https://github.com/tchen-0213/softw/issues) |
| 项目看板 | [GitHub Project「软工小学期」](https://github.com/users/tchen-0213/projects/1) |
| 自动化流水线 | [GitHub Actions](https://github.com/tchen-0213/softw/actions) |

职责划分如下：

- Repository 保存源码、文档、测试、部署配置和提交历史。
- Issues 保存任务说明、负责人、验收清单、讨论和完成证据。
- GitHub Projects 汇总 Issues，并提供状态、优先级、负责人、时间和每日视图。
- GitHub Actions 自动执行测试、构建、镜像和部署检查，并保留运行记录。

## 2. 工作项填写规范

每项任务建立一个 Issue，标题格式为：

```text
[D1-01] 启动原系统并核对运行环境
```

Issue 正文至少包含：

1. 计划日期和负责人。
2. 任务目标与工作清单。
3. 可逐项核对的验收标准。
4. 需要提交的截图、测试结果、提交或 Actions 链接。
5. 风险、阻塞和处理记录（如有）。

提交信息或 Pull Request 应关联对应 Issue，例如 `Refs #1`；完成并确认验收后可使用 `Closes #1`。

## 3. 看板状态流转

Project 使用以下状态：

```text
待启动 -> 开发 -> 测试 -> 部署 -> 已完成
```

| 状态 | 进入条件 |
| --- | --- |
| 待启动 | 任务已定义，负责人、计划日期和验收标准已填写 |
| 开发 | 正在实现或修复，代码和文档持续更新 |
| 测试 | 已进入代码评审、自动化测试或人工验证 |
| 部署 | Pull Request 已合并，正在部署或执行最终健康检查 |
| 已完成 | 验收清单全部满足，证据齐全，Issue 已关闭 |

纯调研、文档或本地验证任务没有实际部署步骤时，可在测试和证据确认完成后直接进入“已完成”，并在 Issue 评论中说明原因。

## 4. 看板视图

当前 Project 通过以下视图检查进度：

- Backlog：检查全部任务和遗漏项。
- Priority board：按优先级安排工作顺序。
- Team items：按负责人检查团队分工。
- Roadmap：检查日期、依赖和阶段节奏。
- My items：查看当前账号负责的任务。
- 每日视图（例如“第1天 | 2026-08-25”）：保留当天计划和完成情况。

每天站会后应更新 Issue 内容、Project 状态和必要字段；状态必须反映真实进度，不能只移动卡片而不补验收证据。

## 5. 验收证据

完成任务前，在对应 Issue 评论或正文中补充与验收标准一一对应的证据：

- 本地运行：Docker 容器状态、健康检查、关键页面和业务操作截图。
- 自动化测试：命令、通过数量、失败数量和关键终端输出。
- 代码或文档：提交哈希、Pull Request 或仓库文件链接。
- CI/CD：成功的 GitHub Actions 运行链接和关键 Job 结果。
- 部署：访问地址、部署日志、Pod/容器状态和健康检查结果。

完成顺序为：补齐证据 -> 勾选验收项 -> 更新 Project 为“已完成” -> 关闭 Issue。若仍有失败、阻塞或证据缺失，应保留在当前状态并记录后续动作。

## 6. GitHub Actions 与本地验证

主流水线位于 `.github/workflows/ci-cd.yml`，负责后端测试、API 完整业务流、前端单元测试与构建、Playwright E2E、镜像构建和 Kubernetes manifest 检查。工作流以 GitHub 上的实际运行结果为准。

当前公网演示使用 GitHub Pages 前端和 Codespaces 后端/MySQL：

```text
前端：https://tchen-0213.github.io/softw/
后端：https://<CODESPACE_NAME>-3001.app.github.dev
健康检查：https://<CODESPACE_NAME>-3001.app.github.dev/api/health
```

Pages 构建读取 Actions Variable `CODESPACE_API_BASE_URL`。Codespaces 3001 端口必须设为 Public；实例休眠后需重新启动。Docker 本地环境作为备用：

```bash
docker compose -f 03_devops/docker-compose.yml up -d --build --wait
```

常用检查地址：

```text
前端：http://localhost:8080
后端健康检查：http://localhost:3001/api/health
```

## 7. 历史 CodeArts 材料

`CodeArts使用说明.md`、`CodeArts看板任务清单.csv`、`CodeArts截图/` 和 `automation/` 中相关脚本记录了早期平台配置与排查过程。它们继续保留用于课程追溯，但不再代表当前任务管理方式，也不应与 GitHub Project 同时维护两套实时状态。
