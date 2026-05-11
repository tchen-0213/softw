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
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=shopping_platform

JWT_SECRET=请修改为自己的密钥
JWT_EXPIRES_IN=30d

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
http://localhost:3000
```

---

## 八、API 接口概览

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
| 鲁再精 | 商品搜索与浏览 | 商品展示、搜索、推荐等功能 |
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
