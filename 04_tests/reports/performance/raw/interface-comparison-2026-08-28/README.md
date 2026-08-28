# 原始性能实验数据

本目录是 2026-08-28 单体/微服务正式对比实验的原始证据，共 18 个 case：

- `*.json`：k6 summary-export 输出。
- `*.txt`：k6 控制台原始输出。
- `*-stats.tsv`：实验期间逐容器 CPU/内存采样。
- `dataset-verification.txt`：两边固定数据集的数量、范围和校验和。

较早且不满足同数据、分接口条件的初步试跑已经移除。正式结论只引用本目录及
`../../interface-comparison-2026-08-28.csv`。
