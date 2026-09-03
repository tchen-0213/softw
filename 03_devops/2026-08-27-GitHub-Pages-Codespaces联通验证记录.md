# 2026-08-27 GitHub Pages + Codespaces 联通验证记录

## 部署结构

```text
浏览器
  -> GitHub Pages: https://tchen-0213.github.io/softw/
  -> Codespaces 3001 Public 端口
  -> Express 单体后端
  -> Codespaces 内 Docker MySQL 8
```

当前 Codespace 后端：

```text
https://softw-defense-demo-5gp6vp6vgjwghv95q-3001.app.github.dev
```

GitHub Actions 仓库变量：

```text
CODESPACE_API_BASE_URL=https://softw-defense-demo-5gp6vp6vgjwghv95q-3001.app.github.dev/api
```

## 部署验证

| 检查 | 实际结果 |
| --- | --- |
| Codespaces 端口 | 3001，Public |
| 后端健康检查 | HTTP 200，`status=ok`，`database=ok` |
| Pages 允许来源 | `Access-Control-Allow-Origin: https://tchen-0213.github.io` |
| Pages 发布工作流 | [运行 #33054053025](https://github.com/tchen-0213/softw/actions/runs/33054053025)，Success |
| 公网路径修复 CI/CD | [运行 #33055335758](https://github.com/tchen-0213/softw/actions/runs/33055335758)，测试、镜像、Kind 部署和健康检查全部成功 |
| 线上静态包 | 包含正确的 Codespaces `/api` 地址 |
| 商品接口 | HTTP 200，返回数据库商品 |
| 浏览器首页 | 商品列表和推荐请求均为 HTTP 200，无 API 请求失败 |

## 公网连通性与当前回归基线

GitHub Pages 与 Codespaces 后端的公网连通性已经实测。当前 Playwright 套件统一为 12 个独立主流程、27 个备选/异常流程和 3 个组合流程，共 42 项：

```bash
API_BASE_URL=https://softw-defense-demo-5gp6vp6vgjwghv95q-3001.app.github.dev \
E2E_BASE_URL=https://tchen-0213.github.io/softw/ \
npm --prefix frontend run test:e2e
```

- Playwright：单体与微服务入口均 42/42 通过，覆盖 UC01-UC12。
- 已验证流水线：[softw-ci-cd #77](https://github.com/tchen-0213/softw/actions/runs/33579985248)，状态 Success。
- 完整结果：`04_tests/reports/tests/2026-09-03-功能测试部署完整复核.md`。

## 问题与修复

首次公网 E2E 使用 `/register`、`/shop` 等根路径，浏览器访问了 `https://tchen-0213.github.io/register`，导致 4 条用例进入 GitHub Pages 404。业务 API 和应用路由本身正常。

提交 `cbc47ff` 根据 `E2E_BASE_URL` 的 pathname 生成页面路径，使本地根路径和 Pages `/softw/` 子路径使用同一套测试。HTML 报告同时移动到 `04_tests/reports/playwright-html/report/`，避免生成报告时删除证据说明文件。

## 使用限制

- 该公网网页用于连通性演示，不等于生产级商业系统；完整业务验收以 UC01-UC12 最新基线为准。
- 当前 Pages 连接的是 Codespaces 中的单体后端，不是 Kubernetes 微服务网关；微服务版本由 Compose、Kind 和 CI/CD 单独验证。
- 支付和物流为课程业务状态模拟，没有连接真实支付机构或物流平台。
- Codespace 休眠或停止后，前端仍可打开，但 API 暂时不可用；重新启动同一 Codespace 后恢复。
- 删除并重建 Codespace 可能改变域名并删除 Docker volumes，需要更新仓库变量并重新运行 Pages 工作流。
