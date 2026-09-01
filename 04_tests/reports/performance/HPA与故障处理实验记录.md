# D8-02 HPA 与依赖服务故障隔离实验记录

实验日期：2026-09-01

## 验收结论

| 验收项 | 实测结果 | 判定 |
| --- | --- | --- |
| 压力升高后 Pod 增加 | `1 → 3 → 5`，5 个 Pod 均进入 Ready | 通过 |
| 压力下降后 Pod 减少 | HPA 期望副本、Deployment 当前/Ready 副本及实际 Pod 数均回到 1 | 通过 |
| 性能与资源指标 | 记录吞吐、平均/P95、错误率、CPU、内存和 25 个时间线样本 | 通过 |
| 依赖服务故障 | 商品接口 HTTP 503，订单依赖检查 HTTP 206 并返回备用提示 | 通过 |
| 故障隔离 | 网关、用户服务、订单服务均保持存活，Deployment 为 `1/1` | 通过 |
| 恢复与无残留 | 商品服务恢复 `1/1`，HPA 恢复为 `min=1/max=5/CPU=60%` | 通过 |

## 实验环境与配置

| 项 | 实测值 |
| --- | --- |
| Kubernetes | Kind，context `kind-softw-practice`，server `v1.34.3` |
| 节点 | 1 个控制平面节点 |
| metrics-server | `v0.8.1`，Metrics API 与 `kubectl top pods` 正常 |
| 商品服务资源 | request `100m/128Mi`，limit `500m/512Mi` |
| HPA | `autoscaling/v2`，CPU 目标 60%，最少 1、最多 5 个副本 |
| 负载 | k6 `v2.2.0`，1 至 12 VU，持续 105 秒，单次受控 CPU burn 80ms |
| 安全上下文 | 清单 `runAsNonRoot=true`，镜像使用数值 UID `1000` |

## 自动扩缩容实验

一键复现：

```bash
npm run experiment:hpa
```

脚本会自动校验 Metrics API 和受控 CPU burn，使用本机 k6；未安装 k6 时改用固定版本的
Docker k6。脚本每 5 秒采集 HPA CPU 百分比、商品服务 CPU 毫核、内存、期望/当前/Ready
副本和实际 Pod 数，并在实际 Pod 数回到 1 后才判定缩容成功。中断时会自动停止采样、端口转发并
恢复 HPA 和单副本基线。

### 关键扩缩容时间线

| 时间 | CPU/目标 | CPU 合计 | 内存合计 | 期望/当前/Ready/实际 Pod |
| --- | --- | ---: | ---: | --- |
| 11:17:28 | `2%/60%` | 1m | 25Mi | `1/1/1/1` |
| 11:17:59 | `15%/60%`（指标采样尚在追赶） | 472m | 31Mi | `3/3/1/3` |
| 11:18:05 | `472%/60%` | 472m | 31Mi | `3/3/3/3` |
| 11:18:17 | `492%/60%` | 492m | 33Mi | `5/5/3/5` |
| 11:18:23 | `492%/60%` | 645m | 84Mi | `5/5/5/5` |
| 11:19:17 | `1%/60%` | 505m（终止中 Pod 尚有指标） | 129Mi | `1/1/1/5` |
| 11:19:47 | `2%/60%` | 2m | 24Mi | `1/1/1/1` |

峰值为 HPA CPU 501%、商品 Pod CPU 合计 645m、内存合计 129Mi。时间线明确区分
Deployment 副本状态与实际 Pod 数，避免把仍在 `Terminating` 的 Pod 误判为已完成缩容。

### k6 结果

| 指标 | 实测值 | 判定 |
| --- | ---: | --- |
| 请求数 | 997 | 完成 |
| 吞吐量 | 9.49 req/s | 已记录 |
| 平均响应时间 | 644.72ms | 已记录 |
| P95 | 1124.54ms | 通过 `< 3000ms` 阈值 |
| 最大响应时间 | 1509.75ms | 已记录 |
| 错误率 | 0/997，0% | 通过 `< 5%` 阈值 |
| 业务断言 | 1994/1994 | 全部通过 |

## 依赖服务故障隔离实验

一键复现：

```bash
npm run experiment:fault
```

CPU 型 HPA 的 `minReplicas=1` 会阻止 Deployment 保持 0 副本，因此脚本先确认 HPA 存在，
实验期间临时删除 HPA，再将 `product-service` 缩至 0。无论成功、失败或 Ctrl+C，`trap`
都会恢复原副本数和 HPA；正常结束还会校验 HPA `minReplicas >= 1`、商品服务至少 1 个 Ready
副本和网关就绪。

| 检查点 | 实测结果 |
| --- | --- |
| 故障前网关 | HTTP 200，三个依赖均 Ready |
| 商品服务 | 故障期间 Deployment `0/0`，商品接口 HTTP 503，提示“依赖服务暂不可用” |
| 订单服务 | 依赖检查 HTTP 206，`status=degraded`，备用提示“商品信息暂不可用，订单查询保持可用” |
| 其他服务 | 网关 `/live` HTTP 200；用户、订单 `/live` 均返回 `alive`；三个 Deployment 均为 `1/1` |
| 恢复 | 商品接口 HTTP 200，网关 `/ready` HTTP 200，HPA 已重新创建 |
| 最终复核 | HPA CPU `1%/60%`、副本 1；商品 Pod `1/1 Running`，无缩容为 0 或 HPA 缺失残留 |

## 原始证据

- `raw/hpa-timeline-2026-09-01-d8-02.tsv`：25 个 CPU、内存和副本/Pod 数样本。
- `raw/hpa-k6-summary-2026-09-01-d8-02.json`：k6 机器可读汇总。
- `raw/hpa-k6-2026-09-01-d8-02.txt`：k6 控制台原始输出与阈值结果。
- `raw/hpa-state-2026-09-01-d8-02.txt`：实验前后 `kubectl get hpa,pods`、`kubectl top` 和 HPA 事件。
- `raw/fault-isolation-2026-09-01-d8-02.txt`：故障注入、206/503 响应、存活探针、日志与恢复输出。
- `raw/hpa-port-forward-2026-09-01-d8-02.txt`、`raw/fault-port-forward-2026-09-01-d8-02.txt`：本地转发原始日志。

看板/云盘截图可在现场分别截取扩容到 5、实际 Pod 回落到 1、故障期间 206/503，以及恢复后
HPA 与 Pod 正常四个状态；截图不保存到 GitHub。
