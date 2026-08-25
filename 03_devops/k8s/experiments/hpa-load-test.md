# 自动扩缩容实验记录模板

## 前置条件

集群已安装 metrics-server，并已应用 `03_devops/k8s/microservices/03-hpa.yaml`。

## 施压命令

```bash
kubectl -n softw-microservices get hpa product-service-hpa --watch
k6 run -e BASE_URL=http://localhost:30081 04_tests/performance/k6-hpa-product-burn.js
```

## 记录指标

| 时间 | 并发/VU | Pod 数 | 吞吐量 | 平均响应时间 | P95 | 错误率 | CPU | 内存 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 |
