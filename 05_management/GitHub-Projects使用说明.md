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
后端：https://softw-defense-demo-5gp6vp6vgjwghv95q-3001.app.github.dev
健康检查：https://softw-defense-demo-5gp6vp6vgjwghv95q-3001.app.github.dev/api/health
```

Pages 构建读取 Actions Variable `CODESPACE_API_BASE_URL`。Codespaces 3001 端口必须设为 Public；实例休眠后需重新启动。Docker 本地环境作为备用：

```bash
docker compose --env-file .env -f 03_devops/docker-compose.yml up -d --build --wait
```

常用检查地址：

```text
前端：http://localhost:8080
后端健康检查：http://localhost:3001/api/health
```

## 7. 当前看板应对齐（2026-09-03）

仓库里的 Issues 已按下面这张表关闭或保留。**GitHub Project 网页上的卡片不会随 Issue 关闭自动换列**，需要已登录成员打开 [Project「软工小学期」](https://github.com/users/tchen-0213/projects/1)，对照拖动后再截当天看板图。自动化环境没有 `read:project` 权限，不能代改看板，也不能用流水线截图顶替。

### 7.1 应放到「已完成」

下列 Issue 均已关闭，验收证据写在 Issue 正文；若卡片仍停在「待启动 / 开发 / 测试 / 部署」，请一次拖到「已完成」。

| Issue | 标题 |
| --- | --- |
| #1 | [D1-01] 启动原系统并核对运行环境 |
| #2 | [D1-02] 建立并确认完整业务场景（用例）清单 |
| #3 | [D1-03] 按用例清单逐项验证原系统功能 |
| #4 | [D1-04] 创建单体基线 Git 标签 monolith-start |
| #5 | [D1-05] 盘点需求、设计图与追溯表缺口 |
| #6 | [D1-06] 盘点单元、集成/API 与端到端测试缺口 |
| #7 | [D1-07] 制定容器化与原系统 CI/CD 实施方案 |
| #8 | [D1-08] 初步确定至少 3 个业务微服务的划分方案 |
| #10 | [D3-01] 美化前端视觉 |
| #12 | [D5-01] 完成中期检查最终复核与证据冻结 |
| #15 | [D6-01] 完成三业务微服务独立构建部署与数据边界复核 |
| #16 | [D6-02] 补齐微服务全部 49 项公开 API 与 UC01-UC12 网关回归 |
| #18 | [D7-01] 跑通微服务 CI/CD、版本化镜像、部署诊断与回滚 |
| #19 | [D7-02] 在同机同数据同脚本下重做单体与微服务性能对比 |
| #20 | [D7-03] 落地并量化订单查询、索引和接口性能优化 |
| #22 | [D8-01] 完成微服务安全加固、Trace ID、日志与就绪检查 |
| #23 | [D8-02] 重做 HPA 扩缩容与依赖服务故障隔离实验 |
| #25 | [D9-01] 执行全量回归、Kubernetes 部署验证与缺陷清零 |
| #26 | [D9-02] 完成交付缺口审计、可编辑文件与 PDF 导出 |

### 7.2 仍打开、按真实进度放列

| Issue | 建议列 | 仓库侧事实 | 组员还要做 |
| --- | --- | --- | --- |
| #28 [D10-01] | 开发 | 技术总结、答辩提纲、UC01/UC02/UC04 追溯已在 `06_defense/` | 答辩 PPT 成品 |
| #29 [D10-02] | 待启动 | 无彩排记录 | 15 分钟彩排、现场脚本、备用录屏 |
| #30 [D10-03] | 开发 | `05_management/个人权重表.md`、`全员确认记录.md` 只有模板 | 填权重数字并全员确认 |
| #31 [D10-04] | 测试 | Word/PDF/核查清单已在 `06_defense/export/` | 规范命名压缩包、权限检查、干净环境复现 |

没有独立 Issue 的增量测试（前后端回归套件）不要另造卡片顶替 D9-01。后端 `REG-BE-001`～`100` 已实测 100/100；前端 `REG-FE-001`～`100` 已注册，Vitest 实测待依赖恢复。若组员已单独建卡，放在「测试」，补齐 Vitest 通过输出后再进「已完成」。

对齐后请截图保存为 `05_management/看板截图/YYYY-MM-DD-GitHub-Project.png`。站会简报仍按真实开会补写，未开过的会不要补。

## 8. 单一平台约束

本项目只使用 GitHub Repository、Issues、Project 和 Actions 管理代码、任务、看板与流水线。成员不需要在其他平台重复创建任务、同步仓库或维护流水线，答辩时也只展示 GitHub 上的真实记录。
