# 2026-08-27 微服务 Kubernetes 验证记录

## 验证范围

- 三个业务微服务独立构建、启动和健康检查。
- 三个业务数据库及数据表归属隔离。
- API Gateway 和微服务前端在 Kubernetes 中运行。
- 订单跨用户、商品和订单服务完成业务状态流转。
- 库存不足异常路径不会创建订单或错误扣减库存。

## 运行环境

| 项目 | 实际环境 |
| --- | --- |
| 主机 | macOS，Docker Desktop |
| Kubernetes | Kind 集群 `softw-practice` |
| Node.js | 20 |
| 数据库 | MySQL 8.0，PVC `microservice-mysql-data`，容量 1 GiB |
| 命名空间 | `softw-microservices` |
| 镜像版本 | `softw/*:practice`，本地构建后加载到 Kind |

## 部署结果

执行：

```bash
KIND_CLUSTER_NAME=softw-practice sh 03_devops/scripts/build-local-images.sh
kubectl apply -f 03_devops/k8s/microservices
sh 03_devops/scripts/k8s-health-check.sh softw-microservices
```

部署并通过 rollout 的工作负载共 6 个：

1. `microservice-mysql`
2. `user-service`
3. `product-service`
4. `order-service`
5. `api-gateway`
6. `microservice-frontend`

Kubernetes 清单另使用 `kubeconform v0.7.0 -strict` 校验，结果为 17 个资源有效、0 个无效、0 个错误。网关 `/health` 返回 `status=ok`、`version=2.0.0`，集群内访问前端返回 HTML 页面。

## 数据隔离结果

| 数据库 | 实际表 |
| --- | --- |
| `softw_users` | `Users`, `Addresses` |
| `softw_catalog` | `Products`, `Shops`, `Evaluations`, `ChatConversations`, `ChatMessages`, `InventoryReservations` |
| `softw_orders` | `Orders` |

三个服务只声明本服务所属 Sequelize 模型，跨服务业务数据通过内部 HTTP API 和最小快照传递，不存在跨数据库 association 或联表查询。

## 跨服务业务结果

通过 Kind 网关 `http://127.0.0.1:30081` 实际执行：卖家注册 -> 店铺认证 -> 发布库存为 1 的商品 -> 买家注册 -> 下单 -> 支付 -> 发货 -> 确认收货。

| 检查项 | 结果 |
| --- | --- |
| 购买数量 2、库存数量 1 | HTTP 409 |
| 异常请求后的库存 | 仍为 1 |
| 正常订单最终状态 | `已完成` |
| 正常订单最终库存 | 0 |
| 订单服务保存结果 | 订单 ID 1，商品和地址使用快照 |

## 自动化回归

| 测试 | 结果 |
| --- | --- |
| 单体后端单元测试 | 18 通过，0 失败，1 个需独立 API 环境的测试跳过 |
| 前端单元测试 | 2 通过，0 失败 |
| user-service 数据库集成测试 | 1 通过，0 失败 |
| product-service 库存幂等集成测试 | 1 通过，0 失败 |
| order-service 跨服务契约集成测试 | 1 通过，0 失败 |
| API Gateway 路由与降级测试 | 1 通过，0 失败 |
| Playwright 微服务页面 E2E | 4 通过，0 失败，覆盖 UC01-UC09 |

## 远程流水线状态

- 实现提交：[`63585e0`](https://github.com/tchen-0213/softw/commit/63585e0c9b6cd3b178b61be146c077e98e437dd3)
- GitHub Actions：[#33037596220](https://github.com/tchen-0213/softw/actions/runs/33037596220)
- 最终结果：`Success`
- 已通过阶段：后端测试、前端构建、Playwright E2E、四项微服务矩阵测试、七个版本镜像构建、Kind 部署、rollout 和集群内健康检查。
- 版本标签：`microservices-v1` 指向通过上述流水线验证的真实微服务版本。
