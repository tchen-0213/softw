# 自动扩缩容实验

## 前置条件

- Kind 集群已经部署 `03_devops/k8s/microservices/`。
- metrics-server 可用，`kubectl top pods -n softw-microservices` 能返回指标。
- 本机已安装 k6。

## 一键执行

```bash
npm run experiment:hpa
```

脚本会验证商品服务受控 CPU 负载、运行 k6、每 5 秒采集 HPA 时间线，并等待副本缩回 1。
任何压测阈值失败、未发生扩容或未缩回单副本都会返回非零退出码。

2026-08-28 实测：商品服务 `1 -> 3 -> 5 -> 1`；1229 次请求，吞吐量 11.70 req/s，
平均 514.08ms，P95 950.10ms，错误率 0%。完整结果与原始数据见
`04_tests/reports/performance/HPA与故障处理实验记录.md`。
