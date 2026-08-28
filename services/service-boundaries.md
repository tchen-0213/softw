# 微服务代码版本说明

本目录提供真实业务微服务版本。三个业务服务各自持久化、只管理自己的表，并通过内部 HTTP API 完成跨服务校验、库存补偿和信用更新。

## 服务清单

| 服务 | 端口 | 职责 | 公开接口 |
| --- | --- | --- | --- |
| api-gateway | 8080 | 统一入口、路由转发、依赖失败降级 | `/health`, `/version`, `/api/**` |
| user-service | 3101 | 注册登录、资料、地址、角色和信用 | `/api/users/**`, `/api/addresses/**` |
| product-service | 3102 | 商品、店铺、评价、聊天、上传和库存 | `/api/products/**`, `/api/secondhand/**`, `/api/shops/**`, `/api/evaluations/**`, `/api/chats/**` |
| order-service | 3103 | 下单、支付、取消、物流、收货和订单查询 | `/api/orders/**` |

## 数据表归属

| 服务/数据库 | 负责表 |
| --- | --- |
| user-service / `softw_users` | `Users`, `Addresses` |
| product-service / `softw_catalog` | `Products`, `Shops`, `Evaluations`, `ChatConversations`, `ChatMessages`, `InventoryReservations` |
| order-service / `softw_orders` | `Orders` |

## 跨服务调用规则

- 订单服务创建订单时调用商品服务库存预留接口，不直接查询商品表。
- 订单落库失败或取消时调用幂等释放接口补偿库存，确认收货时完成预留。
- 商品服务创建评价或退款申请时调用订单服务购买证明接口。
- 网关代理失败时返回 503 和备用提示，避免前端长时间等待。
- 订单服务依赖检查失败时返回 `degraded`，核心订单查询仍可用。

## 本地运行

```bash
docker compose --env-file .env -f 03_devops/docker-compose.microservices.yml up -d --build --wait
```
