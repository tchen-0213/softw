# 故障处理实验记录

## 实验目标

验证错误镜像版本能够被 Kubernetes 和流水线发现，诊断材料能够指出根因，回滚后服务恢复 Ready。

## 操作步骤

```bash
kubectl -n softw-microservices set image deployment/product-service \
  product-service=softw/product-service:missing-demo-20260828
kubectl -n softw-microservices rollout status deployment/product-service --timeout=25s
sh 03_devops/scripts/k8s-collect-failure.sh
kubectl -n softw-microservices set image deployment/product-service \
  product-service=softw/product-service:practice
kubectl -n softw-microservices rollout status deployment/product-service --timeout=180s
```

## 期望结果

- 2026-08-28 实际结果：错误版本 Pod 为 `ImagePullBackOff`，rollout 超时。
- Events 显示 `ErrImagePull` 和镜像不存在/无权拉取，这是部署失败根因。
- 旧商品服务副本保持 Ready，未发生全站中断。
- 恢复正确镜像后 Deployment 为 `1/1 Ready`，网关三个依赖均恢复 `ready: true`。
- 原始输出：`04_tests/reports/kubernetes-failure/`。
