# 04_tests 测试与实验数据

## 集中归档

| 类别 | 位置 |
| --- | --- |
| k6 压力脚本 | `performance/` |
| 测试报告 | `reports/tests/` |
| 性能、HPA 与故障实验记录 | `reports/performance/` |
| Playwright HTML 报告 | `reports/playwright-html/`，运行后生成 |

自动化测试源码保留在被测模块旁，避免破坏导入、fixture 和框架配置：

- 后端单元、安全与 API 测试：`../backend/tests/`
- 前端单元与 Playwright E2E：`../frontend/src/**/*.test.*`、`../frontend/e2e/`
- 微服务测试：`../services/*/tests/`
- 微服务公开 API 清单与防漂移测试：`microservices/public-api-manifest.js`、`microservices/public-api-coverage.test.js`
- 微服务公开 API 与业务 E2E：`microservices/api-e2e.test.js`

常用命令应在仓库根目录执行：

```bash
npm run verify
npm run test:api
npm run test:services:inventory
npm run test:services:api
API_BASE_URL=http://127.0.0.1:3001 E2E_BASE_URL=http://localhost:8080 npm run test:e2e
npm run perf:k6
npm run perf:compare
npm run experiment:hpa
npm run experiment:fault
```

`test:services:inventory` 不依赖容器，校验 49 项公开业务 API 与源码、测试编号和
`../02_docs/微服务公开API测试映射.md` 无空白项。`test:services:api` 在微服务环境中经网关
实际执行这些接口，并覆盖 UC01-UC09 的 MAIN、ALT、ERR 路径。

`perf:compare` 会为单体和微服务准备同一批固定数据，对 3 个接口各运行 3 次，并采集 k6、CPU 和
内存原始数据；结束时自动清理实验商品。正式结论见 `reports/performance/性能对比实验报告.md`。

两项云原生实验的正式结论见 `reports/performance/HPA与故障处理实验记录.md`，机器可读汇总、
副本时间线和故障原始响应位于 `reports/performance/raw/`。
