# 华为云 CodeArts 使用说明

## 1. 使用目标

本项目小学期阶段继续使用华为云 CodeArts 作为开发平台。根据课程要求，CodeArts 至少承担以下职责：

- 项目空间管理。
- 代码仓库管理。
- 敏捷看板或 Scrum 过程管理。
- 任务分配和进度跟踪。
- 基础流水线构建验证。

当前部署目标选择为 A：CodeArts 主要用于开发过程管理和代码协作，系统运行演示优先使用本地或测试环境。

## 2. CodeArts 必做操作

以下操作需要在已登录的华为云网页中完成，入口为：

```text
https://devcloud.cn-north-4.huaweicloud.com/home
```

### 2.1 创建项目

1. 进入 CodeArts 首页。
2. 选择“项目”或“新建项目”。
3. 项目名称建议填写：

```text
购物与二手交易平台小学期重构
```

4. 开发模式选择 Scrum 或看板。若页面要求二选一，建议选择 Scrum；若已有看板模板，也可以选择看板。
5. 邀请组员加入项目。

### 2.2 导入代码仓库

1. 进入项目后，打开“代码”或“代码托管 Repo”。
2. 选择“导入外部仓库”。
3. 外部仓库地址填写：

```text
https://github.com/tchen-0213/softw.git
```

4. 仓库名称建议填写：

```text
softw
```

5. 导入完成后，确认仓库中包含：

```text
backend/
frontend/
README.md
测试文档.md
部署文档.md
小学期重构计划.md
```

### 2.3 建立分支规范

建议在 CodeArts Repo 中使用以下分支：

| 分支 | 用途 |
| --- | --- |
| main | 稳定交付分支 |
| dev | 日常集成分支 |
| feature/docs-codearts | CodeArts 和文档完善 |
| feature/security-hardening | 安全加固 |
| feature/performance | 性能优化 |
| feature/testing | 测试体系 |

提交规则：

- 每个任务单独建分支。
- 开发完成后合并到 dev。
- 测试通过后由组长合并到 main。

### 2.4 建立 Scrum 迭代

建议建立两个 Sprint：

| Sprint | 时间 | 目标 |
| --- | --- | --- |
| Sprint 1 | 8 月 25 日 - 8 月 29 日 | 文档完善、环境搭建、测试准备、重构方案 |
| Sprint 2 | 8 月 31 日 - 9 月 4 日 | 系统重构、性能优化、安全加固、总结汇报 |

### 2.5 建立看板列

看板列建议设置为：

```text
待办
进行中
代码评审
测试中
已完成
```

每个任务至少包含：

- 标题。
- 负责人。
- 优先级。
- 所属 Sprint。
- 验收标准。
- 任务状态。

### 2.6 创建工作项

可直接参考仓库中的 `CodeArts看板任务清单.csv` 创建工作项。也可以按以下类别批量创建：

- 项目管理类。
- 文档完善类。
- 测试类。
- 部署与流水线类。
- 重构类。
- 性能优化类。
- 安全加固类。
- 监控日志类。
- 汇报总结类。

### 2.7 配置基础流水线

建议建立一条名为 `softw-ci` 的流水线，步骤如下：

1. 代码源：选择 CodeArts Repo 中的 `softw` 仓库。
2. 触发方式：手动触发，后续可开启 push 触发。
3. 后端依赖安装：

```bash
cd backend
npm ci
```

4. 后端自动化测试：

```bash
cd backend
npm test
```

5. 前端依赖安装与构建：

```bash
cd frontend
npm ci
npm run build
```

6. 如需在流水线中做后端启动检查，可在配置测试数据库环境变量后加入：

```bash
cd backend
npm start
```

流水线通过后，截图或记录构建编号，作为小学期过程证据。

如果 `official_checkout` 步骤出现 `exit status 126`，通常是 CodeArts 执行节点或 checkout 插件环境异常。处理建议：

1. 重新运行流水线。
2. 确认代码源选择的是 CodeArts Repo 中已导入的 `softw` 仓库。
3. 若仍失败，删除该流水线后重新创建一条最小流水线。
4. 最小流水线步骤建议只保留：

```bash
cd backend && npm ci && npm test
cd frontend && npm ci && npm run build
```

5. 保留失败截图和后续成功截图，说明失败原因不是业务代码，而是 checkout 执行环境问题。

### 2.8 当前平台配置记录

截至 2026 年 7 月 12 日，CodeArts 平台侧已完成以下配置：

- 已创建 Scrum 项目 `购物与二手交易平台小学期重构`。
- 已导入 CodeArts Repo 仓库 `softw`。
- 已在 CodeArts SSH 密钥中添加本机公钥 `ply-01 mac ssh`。
- 已将本地最新提交推送到 GitHub 和 CodeArts Repo：

```text
d5bde57 完善小学期CodeArts与非功能优化
```

- 已创建两个 Sprint：

| Sprint | 时间 | 工作项 |
| --- | --- | --- |
| Sprint 1 准备阶段 | 2026-08-25 - 2026-08-29 | CA-01 至 CA-09，共 9 项 |
| Sprint 2 重构优化阶段 | 2026-08-31 - 2026-09-04 | CA-10 至 CA-20，共 11 项 |

- 已执行流水线 `softw-ci` 第 4 次运行，运行提交为：

```text
d5bde57d
```

当前流水线仍失败在 CodeArts 自带的 `official_checkout` 步骤，错误为：

```text
exit status 126
```

已处理过的排查项：

- CodeArts Repo 已同步到最新提交。
- `official_checkout` 的仓库地址已从 GitHub 地址调整为 CodeArts Repo 地址。
- 本地后端测试和前端构建已通过，可证明当前业务代码本身能够完成基础验证。

因此，当前失败记录应归类为 CodeArts checkout 插件或执行节点问题。小学期汇报时可同时展示 CodeArts 失败截图和本地验证结果。

## 3. CodeArts 验收证据

最终汇报建议保留以下截图或记录：

- CodeArts 项目首页。
- CodeArts Repo 仓库页面。
- Scrum Sprint 或看板页面。
- 工作项分配页面。
- 流水线执行页面。如果 CodeArts checkout 插件仍失败，保留失败页面并说明已完成本地等价验证。
- 代码提交记录。
- 缺陷或任务关闭记录。

当前仓库已保存的关键截图包括：

- `CodeArts截图/08-CodeArts-Sprint1工作项.png`
- `CodeArts截图/09-CodeArts-Sprint2工作项.png`
- `CodeArts截图/10-CodeArts-SSH密钥页.png`
- `CodeArts截图/13-CodeArts流水线第4次最新提交checkout失败详情.png`

## 4. 注意事项

- 不要在仓库中提交真实数据库密码、JWT 密钥、云服务密钥。
- 真实配置放在 CodeArts 环境变量或本地 `.env` 中。
- 文档中使用占位符即可，例如 `DB_PASSWORD=your_password`。
- 如果学校要求必须云端部署，再将部署目标从 A 调整为华为云 ECS/RDS 方案。
