# Database migrations

数据库结构变更按文件名前缀顺序执行，并记录在 MySQL 的 `schema_migrations` 表中。

| 版本 | 作用 |
| --- | --- |
| `001-baseline-schema.js` | 根据 Sequelize 模型建立完整业务表基线 |
| `002-marketplace-fields.js` | 为旧数据库补齐议价和店铺认证字段 |
| `003-bargain-redemption.js` | 为议价消息增加一次性下单核销时间字段 |

常用命令：

```bash
npm run db:migrate
npm run db:migrate:status
npm run db:migrate:down
```

后端启动及两个演示数据脚本都会先执行 `db:migrate` 的同一套逻辑。迁移成功后才写入版本记录；失败会返回非零状态，后续迁移不会继续执行。
