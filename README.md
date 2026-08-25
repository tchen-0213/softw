# 购物与二手交易平台

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
├── backend/                     # 后端服务
│   ├── app.js                   # 后端入口文件
│   ├── config/                  # 数据库配置
│   ├── controllers/             # 控制器
│   ├── middleware/              # 中间件
│   ├── models/                  # Sequelize 数据模型
│   ├── routes/                  # 路由文件
│   ├── package.json             # 后端依赖配置
│   └── .env.example             # 环境变量示例文件
│
├── frontend/                    # 前端项目
│   ├── index.html
│   ├── src/
│   │   ├── components/          # 公共组件
│   │   ├── pages/               # 页面组件
│   │   ├── services/            # API 请求封装
│   │   ├── store/               # Redux 状态管理
│   │   ├── styles/              # 样式文件
│   │   ├── App.jsx              # 前端路由入口
│   │   └── main.jsx             # React 入口
│   ├── package.json
│   └── vite.config.js
│
├── 软件需求规格说明书.md
├── 软件概要设计说明书.md
├── 软件详细设计说明书.md
├── 软件开发计划书.md
└── README.md
```

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

推荐部署方式：

- 前端：Railway 或 Vercel
- 后端：Railway
- 数据库：Railway MySQL 或其他云 MySQL

当前 Railway 部署地址：

```text
前端：https://frontend-production-b71b.up.railway.app
后端：https://backend-production-8506.up.railway.app
健康检查：https://backend-production-8506.up.railway.app/api/health
```

### 1. 部署数据库

在线上创建一个 MySQL 8.0 数据库，并记录以下信息：

```text
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
```

数据库表会由 Sequelize 在后端启动时自动同步。

### 2. 部署后端

在 Railway 创建 Web Service，连接本仓库或使用 CLI 部署。

后端服务配置：

```text
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

后端环境变量：

```env
PORT=3001
DB_HOST=你的线上数据库地址
DB_PORT=3306
DB_USER=你的线上数据库用户
DB_PASSWORD=你的线上数据库密码
DB_NAME=shopping_platform
JWT_SECRET=请换成足够长的随机字符串
JWT_EXPIRES_IN=30d
CORS_ORIGIN=你的前端线上地址
NODE_ENV=production
```

部署完成后，访问后端健康检查接口：

```text
https://你的后端域名/api/health
```

返回 `{"status":"ok"}` 表示后端已启动。

项目已包含 `backend/railway.json`，可直接用于 Railway 后端部署。

### 3. 部署前端

在 Railway 或 Vercel 创建前端服务，连接本仓库。

前端项目配置：

```text
Root Directory: frontend
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

前端环境变量：

```env
VITE_API_BASE_URL=https://你的后端域名/api
VITE_API_TIMEOUT=10000
```

项目已包含：

- `frontend/railway.json`：用于 Railway 前端部署
- `frontend/vercel.json`：用于 Vercel 上支持 React Router 页面刷新和直接访问子路由

### 4. 回填跨域地址

前端部署成功后，将 Vercel 生成的前端地址填回后端环境变量：

```env
CORS_ORIGIN=https://你的前端域名
```

然后重新部署后端。

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

## 十一、小学期重构与 CodeArts 管理

小学期阶段继续使用华为云 CodeArts 作为开发平台，在大作业基础上采用稳定增强路线进行系统重构和持续优化。当前路线保留 React + Express + Sequelize + MySQL 技术栈，重点完善敏捷过程、文档、测试、部署流程、安全性、性能和可观测性。

小学期新增材料：

| 文档 | 说明 |
| --- | --- |
| `小学期重构计划.md` | 时间安排、分工、任务拆解和验收成果 |
| `CodeArts使用说明.md` | CodeArts 项目、仓库、看板、流水线操作说明 |
| `CodeArts看板任务清单.csv` | 可导入或手工创建到 CodeArts 的任务清单 |
| `敏捷开发记录.md` | Scrum/Sprint 计划、每日站会和风险跟踪 |
| `微服务拆分设计.md` | 稳定路线下的微服务拆分和网关设计 |
| `性能优化与压测方案.md` | 高性能、高并发优化和压测计划 |
| `安全加固方案.md` | JWT、参数校验、限流、上传和权限安全方案 |

CodeArts 必做内容：

- 创建 CodeArts 项目并邀请组员。
- 导入当前 Git 仓库。
- 建立 Scrum 或看板流程。
- 创建 Sprint 1 和 Sprint 2。
- 按 `CodeArts看板任务清单.csv` 建立工作项。
- 配置基础 CI 流水线，至少完成依赖安装和前端构建。

当前部署目标为 A：CodeArts 用于开发过程和协作管理，系统运行演示优先采用本地或测试环境。若课程后续要求云端部署，可扩展为华为云 ECS + RDS + CodeArts Pipeline/Deploy。

---

## 十二、2026 夏小学期验收入口

本仓库已补充小学期集中实践所需的容器化、CI/CD、Kubernetes、微服务骨架、测试报告和交付目录索引。推荐先看：

| 文件或目录 | 用途 |
| --- | --- |
| `小学期交付总览.md` | 按任务书检查全部交付物 |
| `业务场景用例清单与追溯表.md` | 用例、需求、代码、测试追溯 |
| `微服务接口与数据归属.md` | 服务划分、接口清单、数据表归属 |
| `services/` | API 网关、用户、商品、订单 3 个业务微服务 |
| `docker-compose.yml` | 单体前端、后端、MySQL 容器化启动 |
| `docker-compose.microservices.yml` | 微服务版本本地启动 |
| `.github/workflows/ci-cd.yml` | 自动测试、构建镜像、K8s manifest 检查 |
| `k8s/monolith` | 单体版本 Kubernetes 部署 |
| `k8s/microservices` | 微服务版本 Kubernetes 部署和 HPA |
| `reports/` | 测试报告和性能对比记录模板 |
| `未完成任务清单.md` | 仍需现场、团队或真实环境完成的事项 |

### 本地验证

```bash
npm run verify
```

等价于：

```bash
npm --prefix backend test
npm run test:services
npm --prefix frontend run build
```

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

说明：GitHub Pages 只能托管静态前端，不能运行 Node.js 后端和 MySQL。完整业务演示仍建议使用 Docker Compose 或 Kubernetes 环境。

### 单体容器化启动

```bash
docker compose up --build
```

启动后访问：

```text
前端：http://localhost:8080
后端健康检查：http://localhost:3001/api/health
```

### 微服务版本本地启动

```bash
docker compose -f docker-compose.microservices.yml up --build
```

启动后访问：

```text
API 网关：http://localhost:8081/health
用户服务：http://localhost:3101/health
商品服务：http://localhost:3102/health
订单服务：http://localhost:3103/health
```

### Kubernetes 部署

```bash
kubectl apply -f k8s/monolith
kubectl apply -f k8s/microservices
```

检查命令：

```bash
kind create cluster --name softw-practice --config k8s/kind-config.yaml
sh scripts/build-local-images.sh
sh scripts/k8s-health-check.sh softw-practice
kubectl -n softw-microservices get pods,svc,hpa
```

### 原系统基线标签

确认当前单体版本可作为改造前基线后执行：

```bash
sh scripts/tag-monolith.sh
```
