# 自动扩缩容实验

## 前置条件

- Kubernetes 集群已经部署 `03_devops/k8s/microservices/`。
- metrics-server 可用，`kubectl top pods -n softw-microservices` 能返回指标。
- 本机已安装 k6，或 Docker 可运行 `grafana/k6:2.2.0`。

## 一键执行

```bash
npm run experiment:hpa
```

脚本会验证商品服务受控 CPU 负载、自动建立端口转发、运行 k6，并每 5 秒采集 CPU、内存、
HPA/Deployment 副本和实际 Pod 数。任何压测阈值失败、未发生扩容，或实际 Pod 数未缩回 1，
都会返回非零退出码；中断时自动恢复 HPA 与单副本基线。

2026-09-01 重做实测：商品服务 `1 -> 3 -> 5 -> 1`；997 次请求，吞吐量 9.49 req/s，
平均 644.72ms，P95 1124.54ms，错误率 0%。完整结果与原始数据见
`04_tests/reports/performance/HPA与故障处理实验记录.md`。
