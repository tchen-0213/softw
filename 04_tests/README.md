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
- 微服务测试：`../services/*/tests/`

常用命令应在仓库根目录执行：

```bash
npm run verify
npm --prefix frontend run test:coverage
npm run test:api
API_BASE_URL=http://127.0.0.1:3001 E2E_BASE_URL=http://localhost:8080 npm run test:e2e
npm run perf:k6
```

前端覆盖率报告由 `test:coverage` 生成到 `reports/coverage/frontend/`。覆盖范围包括购物车与商品 Redux 状态、账户存储、API 客户端、商品筛选/排序/搜索、购物车项、信用徽章、地址管理、认证页和购物车页；四项全局门禁均为 80%。
