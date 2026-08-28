# Kubernetes 部署失败原始证据

采集时间：2026-08-28 14:31（Asia/Shanghai）
命名空间：`softw-microservices`
故障注入：`product-service=softw/product-service:missing-demo-20260828`

## 结论

- `workloads.txt`：错误版本 Pod 为 `ImagePullBackOff`，原 `practice` Pod 继续 Running。
- `pods-describe.txt`：容器等待原因为 `ImagePullBackOff`，镜像名与故障注入一致。
- `events.txt`：出现 `ErrImagePull`，根因是镜像不存在或没有拉取权限。
- `*.log`：其他服务仍在运行；错误商品服务没有新容器日志，说明失败发生在应用启动前。

恢复到 `softw/product-service:practice` 后，Deployment 为 `1/1 Ready`，API Gateway `/ready` 返回
三个依赖均为 `ready: true`。这些文件由 `03_devops/scripts/k8s-collect-failure.sh` 自动生成。
