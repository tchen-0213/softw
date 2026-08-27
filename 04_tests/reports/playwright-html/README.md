# Playwright 浏览器测试证据

本目录用于存放本地运行 Playwright 后生成的 HTML 报告。报告中的 `index.html`、截图、跟踪文件等属于可再生成产物，不提交到仓库。

## 查看验证结果

- [小学期测试报告](../tests/测试报告-小学期.md)：包含浏览器 E2E 通过数量、UC01-UC09 覆盖关系和测试入口。
- [2026-08-25 CI/CD 验证记录](../../../03_devops/2026-08-25-CI-CD验证记录.md)：包含成功运行、浏览器 E2E 阶段及截图证据。
- [GitHub Actions 成功运行 #9](https://github.com/tchen-0213/softw/actions/runs/32803523921)：可在线查看流水线与浏览器测试结果。

## 本地重新生成

系统启动后，在仓库根目录执行：

```bash
npm run test:e2e
```

运行结束后，完整 HTML 报告生成在本目录的 `report/index.html`，可在本地浏览器中打开。
