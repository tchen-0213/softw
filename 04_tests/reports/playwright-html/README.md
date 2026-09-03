# Playwright 浏览器测试证据

本目录用于存放本地运行 Playwright 后生成的 HTML 报告。报告中的 `index.html`、截图、跟踪文件等属于可再生成产物，不提交到仓库。

## 查看验证结果

- [2026-09-03 功能测试与部署完整复核](../tests/2026-09-03-功能测试部署完整复核.md)：浏览器 E2E 在单体与微服务入口均 42/42 通过，覆盖 UC01-UC12。
- [GitHub Actions softw-ci-cd](https://github.com/tchen-0213/softw/actions/workflows/ci-cd.yml)：查看当前提交的单体与微服务入口测试结果及工件。

## 本地重新生成

系统启动后，在仓库根目录执行：

```bash
npm run test:e2e
```

运行结束后，完整 HTML 报告生成在本目录的 `report/index.html`，可在本地浏览器中打开。
