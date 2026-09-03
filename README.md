# 购物与二手交易平台

给老师交作业请打开 [`06_defense/export/`](06_defense/export/)：每份说明书都有 Word（`.docx`）和 PDF，先看 `06_defense/export/00-请先看这个.txt`。仓库里的 Markdown 是协作源文件。

本项目为 2026 软件工程课程大作业，旨在实现一个集新品购物与二手交易于一体的综合交易平台。系统支持用户注册登录、商品浏览与搜索、商品详情查看、购物车、订单管理、二手商品发布、评价体系、个人中心、店铺管理等功能。

## 一、项目简介

购物与二手交易平台面向普通买家、个人卖家和小型商家，提供完整的线上交易流程。平台既支持普通商品的浏览、下单和购买，也支持用户发布二手商品，方便用户完成闲置物品交易。

系统主要包括：

- 用户注册与登录
- 商品搜索与浏览
- 商品详情展示
- 购物车管理
- 订单创建与管理
- 二手商品发布与交易
- 用户评价与信用体系
- 个人中心
- 店铺管理
- 物流信息展示

## 二、技术栈

### 前端

- React
- Vite
- React Router
- Redux Toolkit
- React Redux
- Ant Design
- Axios

### 后端

- Node.js
- Express
- Sequelize
- MySQL
- JWT
- bcryptjs
- dotenv
- cors

### 数据库

- MySQL

## 三、项目结构

```text
softw/
├── 01_source/                   # 代码和仓库清单
├── 02_docs/                     # 需求、设计、测试、追溯和模型
├── 03_devops/                   # Compose、K8s、数据库与运维脚本
├── 04_tests/                    # 压测脚本、报告和实验数据
├── 05_management/               # 计划、站会、看板和贡献材料
├── 06_defense/                  # 答辩材料；给老师的 Word/PDF 在 06_defense/export/
├── backend/                     # Express 单体后端及邻近测试
├── frontend/                    # React 前端及 Playwright E2E
├── services/                    # 网关和三个业务微服务
├── .github/workflows/           # GitHub Actions 固定目录
├── package.json                 # 仓库级验证和部署命令
└── README.md
```

说明：课程交付材料按 `01` 至 `06` 归档；实际源码、模块测试、Dockerfile 和 GitHub 工作流保留在工具要求的可运行位置，并通过各目录 `README.md` 建立索引。

##  四、功能模块

### 1. 用户模块

- 用户注册
- 用户登录
- JWT 身份认证
- 个人信息查看与修改
- 修改密码

### 2. 商品模块

- 商品列表展示
- 商品详情查看
- 商品搜索
- 商品推荐
- 商品发布
- 商品编辑与删除

### 3. 二手交易模块

- 二手商品发布
- 二手商品浏览
- 二手商品搜索
- 二手商品详情查看
- 二手商品管理

### 4. 购物车模块

- 添加商品到购物车
- 修改商品数量
- 删除购物车商品
- 清空购物车
- 计算总价

### 5. 订单模块

- 创建订单
- 查看订单列表
- 查看订单详情
- 取消订单
- 支付订单
- 更新订单状态

### 6. 评价模块

- 创建商品评价
- 查看商品评价
- 查看用户评价记录
- 回复评价
- 审核评价

### 7. 个人中心与店铺管理

- 个人信息展示
- 我的订单
- 物流跟踪
- 店铺管理

---

## 五、运行环境

建议环境：

```text
Node.js 18+
MySQL 8.0+
npm 9+
```

### 全新机器容器化复现（推荐）

全新机器只需安装 Git 和 Docker Desktop，不需要预先安装 Node.js 或 MySQL：

```bash
git clone https://github.com/tchen-0213/softw.git
cd softw
sh 03_devops/scripts/init-local-env.sh
docker compose --env-file .env -f 03_devops/docker-compose.yml up -d --build --wait
```

后端启动时会自动按版本执行 `backend/database/migrations/` 中的数据库迁移。检查容器、迁移版本和健康状态：

```bash
docker compose --env-file .env -f 03_devops/docker-compose.yml ps
docker compose --env-file .env -f 03_devops/docker-compose.yml exec backend npm run db:migrate:status
curl --fail http://127.0.0.1:3001/api/health
curl --fail http://127.0.0.1:8080/
```

导入可重复执行的完整答辩演示数据：

```bash
docker compose --env-file .env -f 03_devops/docker-compose.yml exec backend npm run seed:scenario
```

演示账号统一密码为 `Demo@123456`，卖家账号为 `demo-seller@example.com`。浏览器访问 `http://127.0.0.1:8080/`。需要清空数据库并重新验证全新安装时执行：

```bash
docker compose --env-file .env -f 03_devops/docker-compose.yml down -v
docker compose --env-file .env -f 03_devops/docker-compose.yml up -d --build --wait
```

---

## 六、后端启动方式

进入后端目录：

```bash
cd backend
```

安装依赖：

```bash
npm install
```

创建数据库：

```sql
CREATE DATABASE shopping_platform DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

创建 `.env` 文件：

```env
PORT=3001

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=shopping_platform

JWT_SECRET=请修改为自己的密钥
JWT_EXPIRES_IN=30d
CORS_ORIGIN=http://localhost:5173

NODE_ENV=development
```

启动后端：

```bash
npm run db:migrate
npm run dev
```

后端默认运行地址：

```text
http://localhost:3001
```

健康检查接口：

```text
http://localhost:3001/api/health
```

---

## 七、前端启动方式

进入前端目录：

```bash
cd frontend
```

安装依赖：

```bash
npm install
```

启动前端：

```bash
npm run dev
```

前端默认运行地址：

```text
http://localhost:5173
```

---

## 八、上线部署

当前且唯一的课程公网演示方式：

- 前端：GitHub Pages，`https://tchen-0213.github.io/softw/`
- 后端：GitHub Codespaces 的 3001 公网端口
- 数据库：Codespaces 内 Docker MySQL
- 自动发布：`.github/workflows/github-pages.yml`

### 1. 启动 Codespaces 后端和数据库

从仓库页面进入 `Code -> Codespaces`，启动现有 Codespace。`.devcontainer/devcontainer.json` 会准备 Docker，并自动执行：

```bash
sh 03_devops/scripts/codespace-start.sh
```

也可以在 Codespaces 终端手动运行该命令。脚本通过 Docker Compose 启动 Express 后端、MySQL 和备用容器前端。检查：

```bash
curl http://localhost:3001/api/health
docker compose --env-file .env -f 03_devops/docker-compose.yml ps
```

### 2. 公开后端端口

在 Codespaces 的 `PORTS` 面板找到 `3001`，将 `Port Visibility` 设置为 `Public`。当前已验证的后端地址为：

```text
https://softw-defense-demo-5gp6vp6vgjwghv95q-3001.app.github.dev
```

健康检查：

```text
https://softw-defense-demo-5gp6vp6vgjwghv95q-3001.app.github.dev/api/health
```

### 3. 连接并发布 GitHub Pages

仓库 `Settings -> Secrets and variables -> Actions -> Variables` 中配置：

```text
Name:  CODESPACE_API_BASE_URL
Value: https://softw-defense-demo-5gp6vp6vgjwghv95q-3001.app.github.dev/api
```

随后在 Actions 中手动运行 `deploy-github-pages`，分支选择 `main`。工作流会将 `VITE_API_BASE_URL` 写入前端生产包并部署到：

```text
https://tchen-0213.github.io/softw/
```

### 4. 部署验证与限制

- Pages 发布：[运行 #33054053025](https://github.com/tchen-0213/softw/actions/runs/33054053025)，成功。
- 验证记录：`03_devops/2026-08-27-GitHub-Pages-Codespaces联通验证记录.md`。
- 最新全量测试：见 `04_tests/README.md` 与 `04_tests/reports/tests/测试报告-小学期.md`；Playwright 共 42 项，在单体与微服务入口均 42/42 通过并覆盖 UC01-UC12。
- Codespace 休眠时 API 会暂时离线；重新启动同一 Codespace 后恢复。
- 重建 Codespace 后域名可能变化，需要更新 `CODESPACE_API_BASE_URL` 并重新运行 Pages 工作流。
- 删除 Codespace 会删除其中的 Docker volumes，包括该环境的 MySQL 数据和上传文件。

---

## 九、API 接口概览

### 用户接口

```text
POST /api/users/register        用户注册
POST /api/users/login           用户登录
GET  /api/users/profile         获取用户信息
PUT  /api/users/profile         修改用户信息
PUT  /api/users/password        修改密码
```

### 商品接口

```text
GET    /api/products             获取商品列表
GET    /api/products/:id         获取商品详情
GET    /api/products/search      搜索商品
GET    /api/products/recommended 获取推荐商品
POST   /api/products             创建商品
PUT    /api/products/:id         修改商品
DELETE /api/products/:id         删除商品
```

### 二手商品接口

```text
GET    /api/secondhand           获取二手商品列表
GET    /api/secondhand/:id       获取二手商品详情
GET    /api/secondhand/search    搜索二手商品
POST   /api/secondhand           发布二手商品
PUT    /api/secondhand/:id       修改二手商品
DELETE /api/secondhand/:id       删除二手商品
```

### 订单接口

```text
POST /api/orders                 创建订单
GET  /api/orders                 获取订单列表
GET  /api/orders/:id             获取订单详情
PUT  /api/orders/:id             更新订单状态
POST /api/orders/:id/cancel      取消订单
POST /api/orders/:id/pay         支付订单
```

### 评价接口

```text
POST /api/evaluations             创建评价
GET  /api/evaluations/product     获取商品评价
GET  /api/evaluations/user        获取用户评价
PUT  /api/evaluations/:id/reply   回复评价
PUT  /api/evaluations/:id/approve 审核评价
```

---

## 九、团队分工

| 成员 | 负责模块 | 主要职责 |
| --- | --- | --- |
| 鲁在精 | 商品搜索与浏览 | 商品展示、搜索、推荐等功能 |
| 浦灵一 | 在线下单与支付 | 购物车、订单、支付流程 |
| 剧博洋 | 二手商品发布与交易 | 二手商品发布、管理、交易流程 |
| 陈子正 | 信用评价体系 | 用户评价、信用分、纠纷处理 |
| 赵紫嫣 | 个人店铺管理 | 店铺管理、商品管理 |
| 王悠然 | 物流跟踪 | 物流信息展示、订单状态更新 |

---

## 十、协作规范

### 分支规范

```text
main                 稳定版本
dev                  开发整合分支
feature/user         用户模块
feature/product      商品模块
feature/order        订单模块
feature/secondhand   二手交易模块
feature/evaluation   评价模块
```

### 提交流程

开发前先拉取最新代码：

```bash
git pull origin main
```

新建自己的功能分支：

```bash
git checkout -b feature/模块名
```

提交代码：

```bash
git add .
git commit -m "完成某某功能"
git push origin feature/模块名
```

---

## 十一、小学期重构与 GitHub Projects 管理

小学期阶段统一使用 GitHub 进行代码托管和协作管理：以 [GitHub Project「软工小学期」](https://github.com/users/tchen-0213/projects/1) 管理任务看板，以 [Issues](https://github.com/tchen-0213/softw/issues) 承载任务内容与验收证据，以 [GitHub Actions](https://github.com/tchen-0213/softw/actions) 执行持续集成。在大作业基础上采用稳定增强路线进行系统重构和持续优化，保留 React + Express + Sequelize + MySQL 技术栈，重点完善敏捷过程、文档、测试、部署流程、安全性、性能和可观测性。

小学期新增材料：

| 文档 | 说明 |
| --- | --- |
| `05_management/小学期重构计划.md` | 时间安排、分工、任务拆解和验收成果 |
| `05_management/GitHub-Projects使用说明.md` | GitHub Projects、Issues、Actions 的当前操作与验收规则 |
| `05_management/敏捷开发记录.md` | Scrum/Sprint 计划、每日站会和风险跟踪 |
| `02_docs/微服务拆分设计.md` | 稳定路线下的微服务拆分和网关设计 |
| `02_docs/性能优化与压测方案.md` | 高性能、高并发优化和压测计划 |
| `02_docs/安全加固方案.md` | JWT、参数校验、限流、上传和权限安全方案 |

GitHub Projects 必做内容：

- 每项工作建立独立 Issue，标题使用 `[D1-01]` 形式的任务编号，并填写负责人、计划日期、任务清单、验收标准和证据要求。
- 将 Issue 加入 Project，按 `待启动 -> 开发 -> 测试 -> 部署 -> 已完成` 流转；仅在验收项和证据完整后关闭 Issue。
- 使用 Backlog、Priority board、Team items、Roadmap、My items 和每日视图检查范围、优先级、负责人、时间与当天进度。
- 代码变更通过分支和 Pull Request 关联 Issue；构建、测试与部署结果由 GitHub Actions 留痕。
- 每日站会后更新看板，并保留关键截图、测试输出、提交或 Actions 运行链接作为验收证据。

当前管理与部署口径：GitHub Projects 和 Issues 用于过程管理，GitHub Actions 用于 CI/CD；GitHub Pages 托管静态前端，GitHub Codespaces 运行后端和 MySQL，Docker Compose 与 Kind 用于本地及流水线复现。项目不再使用其他代码托管或看板平台。

GitHub Actions 不在工作流中保存口令。首次运行前，在仓库 `Settings -> Secrets and variables -> Actions`
中创建以下 Repository secrets：

```text
CI_MYSQL_ROOT_PASSWORD
CI_DB_PASSWORD
CI_JWT_SECRET
CI_INTERNAL_SERVICE_TOKEN
```

四个值应分别随机生成；它们只用于临时 CI 数据库、服务认证和 Kind 部署，不写入仓库或测试报告。

---

## 十二、2026 夏小学期验收入口

本仓库已补充小学期集中实践所需的容器化、CI/CD、Kubernetes、三个可独立运行的业务微服务、测试报告和交付目录索引。推荐先看：

| 文件或目录 | 用途 |
| --- | --- |
| `06_defense/小学期交付总览.md` | 按任务书检查全部交付物 |
| `02_docs/业务场景用例清单与追溯表.md` | 用例、需求、代码、测试追溯 |
| `02_docs/微服务接口与数据归属.md` | 服务划分、接口清单、数据表归属 |
| `services/` | API 网关、用户、商品、订单 3 个业务微服务 |
| `03_devops/docker-compose.yml` | 单体前端、后端、MySQL 容器化启动 |
| `03_devops/docker-compose.microservices.yml` | 微服务版本本地启动 |
| `.github/workflows/ci-cd.yml` | 自动测试、构建镜像、K8s manifest 检查 |
| `03_devops/k8s/monolith` | 单体版本 Kubernetes 部署 |
| `03_devops/k8s/microservices` | 微服务版本 Kubernetes 部署和 HPA |
| `04_tests/reports/` | 测试报告、三接口性能对比实测和云原生实验原始数据 |
| `05_management/未完成任务清单.md` | 仍需现场、团队或真实环境完成的事项 |

### 本地验证

```bash
npm run test
npm run build
```

等价于：

```bash
npm --prefix backend test
npm --prefix frontend run test:unit
npm --prefix frontend run test:coverage
npm --prefix frontend run build
```

前端测试采用 Vitest + Testing Library，覆盖核心 Redux 状态、本地存储、API 客户端、商品检索组件、购物车、地址管理和认证页面；`test:coverage` 设置语句、分支、函数、行均不低于 80% 的门禁。Playwright E2E 与 Vitest 已分目录收集，互不误收集。

需要 Docker 单体环境已启动时，可继续运行完整接口链路和浏览器 E2E：

```bash
npm run test:api
API_BASE_URL=http://127.0.0.1:3001 E2E_BASE_URL=http://localhost:8080 npm run test:e2e
```

### GitHub Pages 前端部署

仓库已配置 `.github/workflows/github-pages.yml`。推送到 `main` 后会自动构建 `frontend` 并发布到 GitHub Pages：

```text
https://tchen-0213.github.io/softw/
```

当前公网演示架构：

```text
浏览器 -> GitHub Pages 前端 -> Codespaces 3001 公网端口 -> Express 后端 -> MySQL 容器
```

GitHub Pages 工作流从仓库变量 `CODESPACE_API_BASE_URL` 读取 API 地址，变量值格式为：

```text
https://<CODESPACE_NAME>-3001.app.github.dev/api
```

在仓库 `Settings -> Secrets and variables -> Actions -> Variables` 中更新该变量后，手动运行 `deploy-github-pages` 或再次推送前端文件即可让 Pages 使用新的 Codespaces 地址。GitHub Pages 只能托管静态前端；后端、MySQL 和上传文件实际位于 Codespaces。

### Codespaces 后端部署

仓库的 `.devcontainer/devcontainer.json` 会安装 Docker，并在 Codespace 启动时执行：

```bash
sh 03_devops/scripts/codespace-start.sh
```

脚本启动单体后端、MySQL 和容器前端。用于 Pages 联调的是 `3001` 端口，必须在 Codespaces 的 `Ports` 面板保持 `Public`。健康检查地址为：

```text
https://<CODESPACE_NAME>-3001.app.github.dev/api/health
```

自动化 API/E2E 测试会创建以 `api_`、`e2e_` 开头的临时账号和商品。答辩前可在 Codespaces
终端先预览、再清除这些数据，最后确认演示初始数据完整：

```bash
docker compose --env-file .env -f 03_devops/docker-compose.yml build backend
docker compose --env-file .env -f 03_devops/docker-compose.yml run --rm backend npm run cleanup:test-data
docker compose --env-file .env -f 03_devops/docker-compose.yml run --rm backend npm run cleanup:test-data -- --execute
docker compose --env-file .env -f 03_devops/docker-compose.yml run --rm backend npm run seed:scenario
```

清理命令按外键依赖顺序删除测试消息、会话、评价、订单、地址、店铺、商品和账号；不匹配测试
前缀的演示数据不会被删除。不加 `--execute` 时只显示待清理数量，不修改数据库。

Codespaces 不是长期生产主机：实例停止或休眠后后端不可访问，重建 Codespace 后域名可能变化，此时需要更新 `CODESPACE_API_BASE_URL` 并重新部署 Pages。MySQL 数据和上传文件保存在该 Codespace 的 Docker volumes 中，删除 Codespace 会删除这些运行数据。

### 临时公网完整业务演示

需要让校外设备访问完整前端、后端和 MySQL 业务时，可通过 Cloudflare Quick Tunnel 暴露本机 Docker 单体环境：

```bash
sh 03_devops/scripts/start-public-demo.sh
```

脚本会输出临时的 `https://*.trycloudflare.com` 地址。前端页面、`/api` 和 `/uploads` 均通过该地址访问，MySQL 不直接暴露到公网。停止公网入口：

```bash
docker stop softw-public-tunnel
```

Quick Tunnel 仅适合课程演示：电脑和 Docker 必须保持运行，隧道重建后域名会变化，也不提供生产可用性保证。长期公网部署应使用具名 Cloudflare Tunnel 或云服务器。

### 单体容器化启动

```bash
npm run compose:up
```

启动后访问：

```text
前端：http://localhost:8080
后端健康检查：http://localhost:3001/api/health
```

### 微服务版本本地启动

```bash
docker compose --env-file .env -f 03_devops/docker-compose.microservices.yml up -d --build --wait
```

启动后访问：

```text
微服务前端：http://localhost:8082
API 网关：http://localhost:8081/health
用户服务：http://localhost:3101/health
商品服务：http://localhost:3102/health
订单服务：http://localhost:3103/health
```

微服务公开 API/业务回归和 Kubernetes 可观测性检查：

```bash
npm run test:services:inventory
npm run test:services:api
npm run k8s:observe
```

`test:services:inventory` 无需启动容器，会检查 49 项公开业务 API 与源码、测试编号和文档映射
完全一致；完整清单见 `02_docs/微服务公开API测试映射.md`。

每个后端组件均提供 `/health`、`/ready`、`/version`。CI 中四个微服务各自安装依赖并测试，七个镜像
由独立矩阵任务构建，只推送当前 Git 提交 SHA 标签。所有测试成功后才允许构建镜像，所有镜像成功后才允许
部署。Actions 无论成功或失败都会保留 rollout、Pod、Service、镜像版本和日志工件 14 天。

三个服务分别使用 `softw_users`、`softw_catalog` 和 `softw_orders` 数据库。服务测试由 CI 的 `microservice-test` 作业在独立 MySQL 环境中执行；页面完整流程可运行：

```bash
API_BASE_URL=http://127.0.0.1:8081 E2E_BASE_URL=http://localhost:8082 npm run test:e2e
```

### Kubernetes 部署

```bash
set -a
. ./.env
set +a
IMAGE_TAG=$(git rev-parse HEAD)
sh 03_devops/scripts/build-local-images.sh softw "$IMAGE_TAG"
npm run k8s:deploy -- softw "$IMAGE_TAG"
```

部署脚本会把环境变量写入集群 Secret，再应用单体和微服务 YAML、等待就绪并执行健康检查；仓库不保存
Secret 值。回滚单个 Deployment：

```bash
npm run k8s:rollback -- softw-microservices product-service
npm run k8s:rollback -- softw-microservices product-service 2 "$IMAGE_TAG"
```

检查命令：

```bash
kind create cluster --name softw-practice --config 03_devops/k8s/kind-config.yaml
sh 03_devops/scripts/k8s-health-check.sh softw-practice "$IMAGE_TAG"
sh 03_devops/scripts/k8s-health-check.sh softw-microservices "$IMAGE_TAG"
kubectl -n softw-microservices get pods,svc,hpa
```

受控部署失败与回滚演练会给 `user-service` 设置一个确定不存在的镜像标签，保存 Events、describe 和日志，
随后回滚并重新执行就绪与版本检查：

```bash
sh 03_devops/scripts/run-deployment-failure-drill.sh softw "$IMAGE_TAG" \
  04_tests/reports/kubernetes-deployment/failure-drill
```

也可在 Actions 手动运行 `softw-ci-cd` 并勾选 `run_failure_drill`。完整环境、端口、诊断、恢复和证据说明见
`03_devops/2026-08-31-D7-01-CI-CD部署与回滚验收记录.md`。

### 原系统基线标签

确认当前单体版本可作为改造前基线后执行：

```bash
sh 03_devops/scripts/tag-monolith.sh
```
