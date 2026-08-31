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

常用命令应在仓库根目录执行：

```bash
npm run verify
npm --prefix frontend run test:coverage
npm run test:api
node --test services/api-gateway/common.test.js
API_BASE_URL=http://127.0.0.1:3001 E2E_BASE_URL=http://localhost:8080 npm run test:e2e
npm run perf:k6
```

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
