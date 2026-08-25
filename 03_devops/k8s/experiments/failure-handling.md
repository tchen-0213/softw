# 故障处理实验记录模板

## 实验目标

验证订单服务依赖商品服务失败时，网关和订单服务能够返回可预期结果，其他服务不级联崩溃。

## 操作步骤

```bash
kubectl -n softw-microservices scale deploy/product-service --replicas=0
curl -i http://localhost:30081/api/orders/health/dependencies
kubectl -n softw-microservices get pods
kubectl -n softw-microservices scale deploy/product-service --replicas=1
```

## 期望结果

- `/api/orders/health/dependencies` 返回 `degraded` 或备用提示。
- `api-gateway`、`user-service`、`order-service` 保持 Ready。
- 恢复 `product-service` 后健康检查回到 `ok`。
