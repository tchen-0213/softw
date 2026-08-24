# HPA 与故障处理实验记录

## 环境

| 项 | 值 |
| --- | --- |
| Docker 后端 | Docker Desktop 29.7.2 |
| Kubernetes | kind，context `kind-softw-practice` |
| metrics-server | 已安装，并为 kind 添加 `--kubelet-insecure-tls` |
| 单体入口 | `http://127.0.0.1:30080` |
| 微服务网关 | `http://127.0.0.1:30081` |

## 故障处理实验

操作：

```bash
kubectl -n softw-microservices delete hpa product-service-hpa
kubectl -n softw-microservices scale deploy/product-service --replicas=0
kubectl -n softw-microservices wait --for=delete pod -l app=product-service --timeout=90s
curl -i http://127.0.0.1:30081/api/orders/health/dependencies
kubectl -n softw-microservices scale deploy/product-service --replicas=1
kubectl apply -f k8s/microservices/03-hpa.yaml
```

结果：

```text
product-service endpoints: <none>
HTTP/1.1 206 Partial Content
{"service":"order-service","status":"degraded","dependencies":{"productService":"degraded"},"fallback":"商品信息暂不可用，订单核心查询保持可用"}
恢复后：
{"service":"order-service","status":"ok","dependencies":{"productService":"ok"},"fallback":null}
```

结论：商品服务停止时，订单服务返回设计好的降级结果，网关、订单服务和用户服务保持 Running。

## HPA 扩缩容实验

操作：

```bash
k6 run -e BASE_URL=http://127.0.0.1:30081 performance/k6-hpa-product-burn.js
kubectl -n softw-microservices get hpa product-service-hpa
kubectl -n softw-microservices get pods -l app=product-service
```

关键记录：

| 时间 | HPA 指标 | Replicas | Pod 数 |
| --- | --- | --- | --- |
| 16:36:05 | `cpu: 115%/60%` | 1 | 2 |
| 16:36:20 | `cpu: <unknown>/60%` | 2 | 2 |
| 16:40:04 | `cpu: 1%/60%` | 1 | 2 |
| 16:40:19 | `cpu: 1%/60%` | 1 | 1 |

压测摘要：

```text
iterations: 2379
http_reqs: 2379
avg duration: 1.41s
P95: 3s
error rate: 21.18%
```

说明：HPA 压测脚本故意制造 CPU 压力，网关 3 秒超时导致部分请求失败。该脚本用于证明扩缩容，不用于业务性能对比结论。
