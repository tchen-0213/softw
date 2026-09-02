# 微服务公开 API 与自动化测试映射（D6-02）

## 1. 口径与自动防漂移

- 统计范围：三个业务微服务经 API Gateway 暴露的 48 个 Express 业务路由，以及 1 个静态文件路由，共 49 项。
- 运维端点：三个业务微服务和 API Gateway 的 `/health`、`/ready`、`/version` 另列，共 12 项；CORS 预检另列 1 项。
- `04_tests/microservices/public-api-manifest.js` 是机器可读清单；`public-api-coverage.test.js` 会比较代码路由、清单、本文档和 UC01-UC12 流程矩阵，任一空项或新增未映射路由都会使 CI 失败。
- `api-e2e.test.js` 通过 `http://127.0.0.1:8081` 的 API Gateway 实际调用全部 49 项业务接口，并在结束时断言不存在未执行路由。

## 2. 用户与地址服务（7 项）

| 归属 | 公开 API | 用例 | 自动化编号 | 路径 |
| --- | --- | --- | --- | --- |
| user-service | `POST /api/users/register` | UC01 | `MS-E2E-TC01` | MAIN/ERR |
| user-service | `POST /api/users/login` | UC01 | `MS-E2E-TC01` | MAIN/ALT/ERR |
| user-service | `GET /api/users/profile` | UC01 | `MS-E2E-TC01` | MAIN/ERR |
| user-service | `PUT /api/users/profile` | UC01 | `MS-E2E-TC01` | MAIN/ALT |
| user-service | `PUT /api/users/password` | UC01 | `MS-E2E-TC01` | MAIN/ALT/ERR |
| user-service | `GET /api/addresses` | UC09 | `MS-E2E-TC09` | MAIN/ERR |
| user-service | `PUT /api/addresses` | UC09 | `MS-E2E-TC09` | MAIN/ALT/ERR |

## 3. 商品、二手、店铺、评价、聊天与上传服务（31+1 项）

| 归属 | 公开 API | 用例 | 自动化编号 | 路径 |
| --- | --- | --- | --- | --- |
| product-service | `GET /api/products` | UC02 | `MS-E2E-TC02/03` | MAIN/ALT |
| product-service | `GET /api/products/search` | UC02 | `MS-E2E-TC02/03` | MAIN/ALT |
| product-service | `GET /api/products/recommended` | UC02 | `MS-E2E-TC02/03` | ALT |
| product-service | `GET /api/products/mine` | UC03 | `MS-E2E-TC02/03` | ALT/ERR |
| product-service | `GET /api/products/:id` | UC02/03 | `MS-E2E-TC02/03` | MAIN/ERR |
| product-service | `POST /api/products` | UC03 | `MS-E2E-TC02/03` | MAIN/ERR |
| product-service | `PUT /api/products/:id` | UC03 | `MS-E2E-TC02/03` | MAIN/ALT/ERR |
| product-service | `DELETE /api/products/:id` | UC03 | `MS-E2E-TC02/03` | MAIN/ERR |
| product-service | `GET /api/secondhand` | UC05 | `MS-E2E-TC05` | MAIN/ALT |
| product-service | `GET /api/secondhand/search` | UC05 | `MS-E2E-TC05` | ALT |
| product-service | `GET /api/secondhand/:id` | UC05 | `MS-E2E-TC05` | MAIN/ERR |
| product-service | `POST /api/secondhand` | UC05 | `MS-E2E-TC05` | MAIN/ERR |
| product-service | `PUT /api/secondhand/:id` | UC05 | `MS-E2E-TC05` | ALT/ERR |
| product-service | `DELETE /api/secondhand/:id` | UC05 | `MS-E2E-TC05` | MAIN/ERR |
| product-service | `GET /api/shops/mine` | UC06 | `MS-E2E-TC06` | MAIN/ERR |
| product-service | `PUT /api/shops/mine` | UC06 | `MS-E2E-TC06` | ALT/ERR |
| product-service | `POST /api/shops/mine/verification` | UC06 | `MS-E2E-TC06` | MAIN/ERR |
| product-service | `GET /api/shops/user/:userId` | UC06/12 | `MS-E2E-TC06/12` | MAIN/ALT/ERR |
| product-service | `GET /api/shops/:id` | UC06/12 | `MS-E2E-TC06/12` | MAIN/ALT/ERR |
| product-service | `POST /api/evaluations` | UC07 | `MS-E2E-TC07` | MAIN/ERR |
| product-service | `GET /api/evaluations/product` | UC07 | `MS-E2E-TC07` | MAIN/ALT |
| product-service | `GET /api/evaluations/user` | UC07 | `MS-E2E-TC07` | ALT/ERR |
| product-service | `GET /api/evaluations/seller` | UC07 | `MS-E2E-TC07` | ALT/ERR |
| product-service | `PUT /api/evaluations/:id/approve` | UC07 | `MS-E2E-TC07` | ERR（非管理员） |
| product-service | `PUT /api/evaluations/:id/reply` | UC07 | `MS-E2E-TC07` | MAIN/ALT/ERR |
| product-service | `POST /api/chats/conversations` | UC08 | `MS-E2E-TC08` | MAIN/ERR |
| product-service | `GET /api/chats/conversations` | UC08 | `MS-E2E-TC08` | MAIN/ALT/ERR |
| product-service | `GET /api/chats/conversations/:id` | UC08 | `MS-E2E-TC08` | MAIN/ERR |
| product-service | `POST /api/chats/conversations/:id/messages` | UC08 | `MS-E2E-TC08` | MAIN/ALT/ERR |
| product-service | `PUT /api/chats/messages/:id/decision` | UC08 | `MS-E2E-TC08` | MAIN/ALT/ERR |
| product-service | `POST /api/uploads/images` | UC02/03 | `MS-API-UPLOAD` | MAIN/ERR |
| product-service | `GET /uploads/:filename` | UC02/03 | `MS-API-UPLOAD` | MAIN/ERR |

## 4. 订单服务（10 项）

| 归属 | 公开 API | 用例 | 自动化编号 | 路径 |
| --- | --- | --- | --- | --- |
| order-service | `POST /api/orders` | UC04 | `MS-E2E-TC04` | MAIN/ALT/ERR |
| order-service | `GET /api/orders` | UC04/10 | `MS-E2E-TC04/10` | MAIN/ALT/ERR |
| order-service | `GET /api/orders/seller` | UC04 | `MS-E2E-TC04` | MAIN/ALT/ERR |
| order-service | `GET /api/orders/health/dependencies` | UC04 | `MS-E2E-TC04` | ALT/ERR |
| order-service | `GET /api/orders/:id` | UC04/10 | `MS-E2E-TC04/10` | MAIN/ALT/ERR |
| order-service | `POST /api/orders/:id/pay` | UC04 | `MS-E2E-TC04` | MAIN/ERR |
| order-service | `POST /api/orders/:id/cancel` | UC04/11 | `MS-E2E-TC04/10/11` | MAIN/ALT/ERR |
| order-service | `POST /api/orders/:id/ship` | UC04/10 | `MS-E2E-TC04/10` | MAIN/ALT/ERR |
| order-service | `POST /api/orders/:id/confirm` | UC04 | `MS-E2E-TC04` | MAIN/ERR |
| order-service | `PUT /api/orders/:id` | UC04 | `MS-E2E-TC04` | ALT/ERR |

## 5. UC01-UC12 主、备选和异常路径矩阵

| 用例 | 自动化编号 | MAIN | ALT | ERR |
| --- | --- | --- | --- | --- |
| UC01 | `MS-E2E-TC01` | 注册、登录、读写资料、改密 | 改密后重新登录 | 重复注册、错误密码、错误旧密码 |
| UC02 | `MS-E2E-TC02/03` | 商品列表和详情 | 关键词、类别、排序、推荐 | 商品不存在 |
| UC03 | `MS-E2E-TC02/03` | 发布、更新、删除商品 | 我的商品、上下架状态 | 他人修改/删除、非法状态 |
| UC04 | `MS-E2E-TC04` | 下单、支付、发货、确认 | 幂等重放、取消、兼容状态更新 | 空订单、库存不足、越权、缺物流信息 |
| UC05 | `MS-E2E-TC05` | 发布和查看二手商品 | 搜索、关闭议价、下架 | 他人修改、删除后 404 |
| UC06 | `MS-E2E-TC06` | 店铺生成和认证 | 资料维护、公开查询 | 材料缺失、店铺不存在 |
| UC07 | `MS-E2E-TC07` | 创建评价和卖家回复 | 商品/买家/卖家三类列表 | 重复评价、越权回复、非管理员审核 |
| UC08 | `MS-E2E-TC08` | 建立会话和文本消息 | 议价、同意、退款 | 自聊、越权、非法金额、重复处理 |
| UC09 | `MS-E2E-TC09` | 保存和读取地址 | 替换地址、默认地址归一化 | 非法格式、未登录访问 |
| UC10 | `MS-E2E-TC10/11` | 买家按状态查询订单并查看物流轨迹 | 卖家订单视图、分页筛选 | 他人订单详情被拒绝、异常状态不可取消 |
| UC11 | `MS-E2E-TC10/11` | 取消待付款订单并恢复库存 | 已支付待发货订单仍可取消 | 他人取消、重复取消均无副作用 |
| UC12 | `MS-E2E-TC12` | 按用户公开查看店铺、信用和在售商品 | 按店铺编号查看同一资料 | 不存在店铺返回 404 |

前端页面回归使用 6 条 Playwright 流程组合覆盖 `E2E-TC01` 至 `E2E-TC12`；CI 将 `API_BASE_URL` 指向 `http://127.0.0.1:8081`、将 `E2E_BASE_URL` 指向微服务前端 `http://127.0.0.1:8082`。

## 6. 运维与网关公共行为

| 对象 | 公开端点/行为 | 自动化编号 | 断言 |
| --- | --- | --- | --- |
| user-service | `GET /health`、`GET /ready`、`GET /version` | `OPS-TC01` | 服务名、就绪状态、版本和修订号 |
| product-service | `GET /health`、`GET /ready`、`GET /version` | `OPS-TC01` | 服务名、数据库就绪、版本和修订号 |
| order-service | `GET /health`、`GET /ready`、`GET /version` | `OPS-TC01` | 服务名、数据库就绪、版本和修订号 |
| api-gateway | `GET /health`、`GET /ready`、`GET /version` | `OPS-TC01` | 三个上游就绪、路由表、版本和修订号 |
| api-gateway | `OPTIONS /api/products` | `OPS-TC01` | HTTP 204 与允许方法响应头 |
| api-gateway | 未配置路径 | `OPS-TC01` | HTTP 404 |

## 7. 执行命令

```bash
# 不启动容器即可检查代码路由、清单、文档和 UC 流程矩阵一致性
npm run test:services:inventory

# 微服务 Compose 启动后，通过 Gateway 执行公开 API 与 UC01-UC12 全量回归
npm run test:services:api

# 微服务前端通过 Gateway 执行页面端到端回归
API_BASE_URL=http://127.0.0.1:8081 E2E_BASE_URL=http://127.0.0.1:8082 npm --prefix frontend run test:e2e
```
