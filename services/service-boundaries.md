# 微服务代码版本说明

本目录提供小学期后 5 天验收用的轻量微服务版本。它保留原系统 API 路径风格，用独立进程展示服务边界、健康检查、版本号、网关路由、故障降级和 Kubernetes 部署能力。

## 服务清单

| 服务 | 端口 | 职责 | 公开接口 |
| --- | --- | --- | --- |
| api-gateway | 8080 | 统一入口、路由转发、依赖失败降级 | `/health`, `/version`, `/api/**` |
| user-service | 3101 | 用户资料与信用信息 | `/health`, `/version`, `/api/users`, `/api/users/:id` |
| product-service | 3102 | 商品与二手商品查询 | `/health`, `/version`, `/api/products`, `/api/products/:id`, `/api/secondhand` |
| order-service | 3103 | 订单查询、商品服务依赖检查 | `/health`, `/version`, `/api/orders`, `/api/orders/health/dependencies` |

## 数据表归属

| 服务 | 负责表 |
| --- | --- |
| user-service | `users`, `addresses` |
| product-service | `products`, `shops`, `uploads` |
| order-service | `orders` |
| evaluation-service（后续拆分） | `evaluations` |
| chat-service（后续拆分） | `chat_conversations`, `chat_messages` |

## 跨服务调用规则

- 订单服务需要商品可用性时调用商品服务接口，不直接查询商品表。
- 网关代理失败时返回 503 和备用提示，避免前端长时间等待。
- 订单服务依赖检查失败时返回 `degraded`，核心订单查询仍可用。

## 本地运行

```bash
cd services/user-service && npm install && PORT=3101 npm start
cd services/product-service && npm install && PORT=3102 npm start
cd services/order-service && npm install && PORT=3103 PRODUCT_SERVICE_URL=http://localhost:3102 npm start
cd services/api-gateway && npm install && PORT=8080 npm start
```
