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

常用命令应在仓库根目录执行；以下环境变量前缀写法适用于 Bash：

```bash
npm run verify
npm run verify:full
npm run test:api
npm run test:services
npm run test:services:inventory
npm run test:services:api
npm run test:delivery
API_BASE_URL=http://127.0.0.1:3001 E2E_BASE_URL=http://localhost:8080 npm run test:e2e
API_BASE_URL=http://127.0.0.1:3001 E2E_BASE_URL=http://localhost:8080 npm --prefix frontend run test:e2e -- --grep "E2E-TC07:"
npm run perf:k6
npm run perf:compare
npm run perf:orders
npm run perf:indexes
npm run experiment:hpa
npm run experiment:fault
```

### Windows PowerShell / CMD 的浏览器测试命令

PowerShell（提示符以 `PS` 开头）：

```powershell
$env:API_BASE_URL='http://127.0.0.1:3001'
$env:E2E_BASE_URL='http://localhost:8080'
npm run test:e2e
npm --prefix frontend run test:e2e -- --grep 'E2E-TC07:' --headed
npm --prefix frontend run test:e2e -- --grep 'E2E-TC(01|04|07):' --headed
```

CMD（提示符类似 `C:\Users\zhich\softw>`）：

```bat
set "API_BASE_URL=http://127.0.0.1:3001"
set "E2E_BASE_URL=http://localhost:8080"
npm run test:e2e
npm --prefix frontend run test:e2e -- --grep "E2E-TC07:" --headed
```

每行单独执行，不要复制终端提示符或把 URL 写成 Markdown 链接。`--headed` 用于现场显示浏览器，去掉后为无头执行。微服务测试将 API 地址改为 `http://127.0.0.1:8081`，页面地址改为 `http://localhost:8082`。两套入口均需先启动对应服务。

查看生成的 HTML 报告：

```text
npm --prefix frontend exec playwright show-report ../04_tests/reports/playwright-html/report
```

调用 Bash/shell 的性能、HPA 和故障实验命令需使用 Git Bash 或 WSL，并准备 Docker、Kind 和相应依赖。

Playwright 将 UC01-UC12 分成 12 个相互独立的 `E2E-TC01` 至 `E2E-TC12`。每项测试都会自行
准备所需用户、商品、地址或订单，可使用 `--grep "E2E-TCxx:"` 单独运行，不依赖其他用例的
执行顺序。原有组合流程也继续保留，可使用 `--grep "E2E-TC01/02/03/04/09"`、
`--grep "E2E-TC05/06"` 或 `--grep "E2E-TC10/11"` 运行；TC07、TC08、TC12 本身就是独立
组合入口。单项命令必须保留编号后的冒号，避免同时匹配组合流程。

`test:services:inventory` 不依赖容器，校验 49 项公开业务 API 与源码、测试编号和
`../02_docs/微服务公开API测试映射.md` 无空白项。`test:services:api` 在微服务环境中经网关
实际执行这些接口，并覆盖 UC01-UC12 的 MAIN、ALT、ERR 路径。`test:services` 会自行创建带
随机口令和随机宿主端口的临时 MySQL，逐个验证三个业务服务与网关，结束后自动清理临时容器。

`perf:compare` 会为单体和微服务准备同一批固定数据，对 3 个接口各运行 3 次，并采集 k6、CPU 和
内存原始数据；结束时自动清理实验商品。正式结论见 `reports/performance/性能对比实验报告.md`。

`perf:orders` 对卖家订单旧的全量加载过滤与新的索引分页查询执行同数据 7 轮对比；`perf:indexes`
采集商品、订单、用户核心查询的索引与执行计划。正式结论见
`reports/performance/D7-03订单查询与索引优化报告.md`。

两项云原生实验的正式结论见 `reports/performance/HPA与故障处理实验记录.md`，机器可读汇总、
CPU/内存/实际 Pod 时间线和故障原始响应位于 `reports/performance/raw/`。HPA 脚本在本机没有
k6 时会使用 Docker k6；两项脚本均带自动恢复和无残留校验。

前端覆盖率报告由 `test:coverage` 生成到 `reports/coverage/frontend/`。覆盖范围包括应用路由、公共头部、浮动购物车、购物车与商品 Redux 状态、账户存储、API 客户端、商品筛选/排序/搜索、购物车项、信用徽章、地址管理，以及认证、购物车、结算、商品详情、搜索、订单和公开店铺页面；四项全局门禁均为 80%。

## 2026-09-03 Playwright 独立、扩展与组合用例复核

- 全量运行：42/42 通过，包括 12 个主流程独立用例、27 个备选/异常用例和 3 个多用例连续组合流程。
- 独立运行：`E2E-TC01` 至 `E2E-TC12` 均可按编号单独筛选执行；扩展用例可按 `ALT` 或 `ERR` 标识筛选。
- 组合运行：TC01/02/03/04/09、TC05/06、TC10/11 三组分别筛选，全部通过。
- 扩展覆盖：登录失败、重复注册、空结果与组合筛选、库存边界、购物车清空、结算门禁、商品修改/删除、
  重复评价、拒绝议价、地址默认项、越权访问、订单状态限制和空店铺等场景。
- 连续运行使用不同的浏览器与数据准备客户端标识隔离限流计数，生产限流配置保持不变。

## 2026-09-03 当前完整复核基线

| 层级 | 本机实测结果 | 说明 |
| --- | --- | --- |
| 后端单元/安全/控制器 | 120 通过、0 失败、1 个数据库 API 父入口按设计跳过 | 输入边界、控制器拒绝分支、迁移、安全中间件与 DTO 补强 |
| 前端 Vitest | 17 个文件，100/100 通过 | 全局覆盖率 94.42%/81.83%/92.34%/94.42% |
| 单体真实 MySQL API | 32/32 通过 | UC01-UC12、公开路由、上传和运维端点 |
| Playwright E2E | 单体与微服务入口均 42/42 通过 | 12 个主流程、27 个备选/异常流程、3 个组合流程，覆盖 UC01-UC12 |
| 微服务静态/公共层 | 18/18 通过 | API 防漂移、校验、安全、上传和运维公共层 |
| 微服务隔离集成 | 22/22 通过 | 临时 MySQL 下 user 1、product 3、order 1、gateway 17 |
| 微服务网关 API | 15/15 通过 | 49 项公开 API、UC01-UC12、健康/就绪/版本 |
| 交付与实验证据 | 18/18 通过 | Docker/Compose/CI/K8s/HPA/故障/三轮性能证据 |
| 安全扫描 | 通过 | 纳入扫描的版本控制文件无密钥发现；高危/严重依赖漏洞为 0 |

各命令之间存在公共测试复用，因此不把结果简单相加制造“总测试数”。`npm run verify:full` 已在
Windows + Docker Desktop 上完成全部无浏览器核心门禁、隔离数据库集成、lint 和 1891 模块生产构建；
数据库 API、微服务网关 API 与 Playwright 另在 Compose 实机入口执行；Playwright 同时复核单体和微服务入口。
