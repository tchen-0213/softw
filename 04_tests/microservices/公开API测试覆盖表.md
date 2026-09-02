# 微服务公开 API 自动化覆盖表

测试入口：`api-e2e.test.js`。所有业务请求均从 API Gateway 发出；`/internal/**` 是服务间私有接口，
由订单、评价和退款流程间接验证，不属于公开 API。

| 服务 | 方法与路径 | 自动化测试 |
| --- | --- | --- |
| 运维/网关 | `GET /health`, `/ready`, `/version`（四服务） | `OPS-TC01` |
| 运维/网关 | `OPTIONS /api/products`, 未配置路由 404 | `OPS-TC01` |
| 用户 | `POST /api/users/register`, `/login` | `MS-E2E-TC01` |
| 用户 | `GET/PUT /api/users/profile` | `MS-E2E-TC01` |
| 用户 | `PUT /api/users/password` | `MS-E2E-TC01` |
| 用户 | `GET/PUT /api/addresses` | `MS-E2E-TC09` |
| 商品 | `GET/POST /api/products` | `MS-E2E-TC02/03` |
| 商品 | `GET /api/products/search`, `/recommended`, `/mine` | `MS-E2E-TC02/03` |
| 商品 | `GET/PUT/DELETE /api/products/:id` | `MS-E2E-TC02/03` |
| 二手 | `GET/POST /api/secondhand` | `MS-E2E-TC05` |
| 二手 | `GET /api/secondhand/search` | `MS-E2E-TC05` |
| 二手 | `GET/PUT/DELETE /api/secondhand/:id` | `MS-E2E-TC05` |
| 店铺 | `GET/PUT /api/shops/mine` | `MS-E2E-TC06` |
| 店铺 | `POST /api/shops/mine/verification` | `MS-E2E-TC06` |
| 店铺 | `GET /api/shops/user/:userId`, `/api/shops/:id` | `MS-E2E-TC06/12` |
| 文件 | `POST /api/uploads/images`, `GET /uploads/:file` | `MS-API-UPLOAD` |
| 订单 | `POST/GET /api/orders` | `MS-E2E-TC04` |
| 订单 | `GET /api/orders/seller`, `/api/orders/:id` | `MS-E2E-TC04/10` |
| 订单 | `POST /api/orders/:id/pay`, `/cancel`, `/ship`, `/confirm` | `MS-E2E-TC04/10/11` |
| 订单 | `PUT /api/orders/:id` | `MS-E2E-TC04` |
| 订单 | `GET /api/orders/health/dependencies` | `MS-E2E-TC04` |
| 评价 | `POST /api/evaluations` | `MS-E2E-TC07` |
| 评价 | `GET /api/evaluations/product`, `/user`, `/seller` | `MS-E2E-TC07` |
| 评价 | `PUT /api/evaluations/:id/reply` | `MS-E2E-TC07` |
| 聊天 | `POST/GET /api/chats/conversations` | `MS-E2E-TC08` |
| 聊天 | `GET /api/chats/conversations/:id` | `MS-E2E-TC08` |
| 聊天 | `POST /api/chats/conversations/:id/messages` | `MS-E2E-TC08` |
| 聊天 | `PUT /api/chats/messages/:id/decision` | `MS-E2E-TC08` |

每个业务测试同时包含至少一个失败断言，例如重复注册、旧密码错误、未授权地址、店铺材料缺失、
越权商品修改、非法商品状态、空订单、非法数量、库存不足、越权支付、物流缺失、越权查看物流、重复取消、重复评价、越权回复、
自聊、非法议价金额和重复处理申请。测试失败会使 `microservice-api-e2e` job 失败，从而阻止镜像
构建和 Kubernetes 部署。
