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
- 前端单元/组件测试与公共初始化：`../frontend/tests/`
- 前端 Playwright E2E：`../frontend/e2e/`
- 微服务测试：`../services/*/*.test.js`
- 微服务公开 API 清单与防漂移测试：`microservices/public-api-manifest.js`、`microservices/public-api-coverage.test.js`
- 微服务公开 API 与业务 E2E：`microservices/api-e2e.test.js`

常用命令应在仓库根目录执行：

```bash
npm run verify
npm run test:api
npm run test:services:inventory
npm run test:services:api
node --test services/api-gateway/common.test.js
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

前端覆盖率报告由 `test:coverage` 生成到 `reports/coverage/frontend/`。覆盖范围包括应用路由、公共头部、浮动购物车、购物车与商品 Redux 状态、账户存储、API 客户端、商品筛选/排序/搜索、购物车项、信用徽章、地址管理，以及认证、购物车、结算、商品详情和搜索页面；四项全局门禁均为 80%。

## 2026-08-31 测试补强基线

| 层级 | 当前自动化测试数 | 本机实测结果 |
| --- | ---: | --- |
| 后端单元/安全/控制器 | 61 | 61 通过，0 失败；API 总入口按设计跳过 1 项 |
| 前端 Vitest | 78 | 14 个文件，78/78 通过 |
| 单体 API 集成 | 32 | 由 `test:api` 在 MySQL 环境执行 |
| Playwright E2E | 4 | 覆盖 UC01–UC09 |
| 微服务/网关 | 12 | 4 条服务测试 + 8 条公共基础设施测试 |
| **完整自动化合计** | **187** | 成功、异常、边界、权限、路由和跨服务场景分层覆盖 |

本轮前端扩大覆盖范围后实测：语句 94.38%、分支 82.77%、函数 94.33%、行 94.38%，四项均超过 80% 门禁。`npm run verify` 已完成后端 61 条、前端 78 条和 Vite 生产构建验证。
