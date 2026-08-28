const fs = require('fs');
const path = require('path');

const rawDir = process.argv[2];
const outputFile = process.argv[3];
if (!rawDir || !outputFile) throw new Error('usage: node summarize-interface-comparison.js RAW_DIR OUTPUT_CSV');

const toMiB = value => {
  const match = String(value).match(/^([\d.]+)([KMG]iB)$/);
  if (!match) throw new Error(`Unsupported memory value: ${value}`);
  const factors = { KiB: 1 / 1024, MiB: 1, GiB: 1024 };
  return Number(match[1]) * factors[match[2]];
};

const rows = [];
for (const file of fs.readdirSync(rawDir).filter(name => name.endsWith('.json')).sort()) {
  const match = file.match(/^(monolith|microservices)-(list|search|detail)-run([123])\.json$/);
  if (!match) continue;
  const [, version, endpoint, run] = match;
  const summary = JSON.parse(fs.readFileSync(path.join(rawDir, file), 'utf8'));
  const statsFile = path.join(rawDir, file.replace('.json', '-stats.tsv'));
  const samples = new Map();
  for (const line of fs.readFileSync(statsFile, 'utf8').trim().split('\n').slice(1)) {
    const [timestamp, , cpu, memory] = line.split('\t');
    const sample = samples.get(timestamp) || { cpu: 0, memory: 0 };
    sample.cpu += Number(cpu.replace('%', ''));
    sample.memory += toMiB(memory.split('/')[0].trim());
    samples.set(timestamp, sample);
  }
  const values = [...samples.values()];
  const average = key => values.reduce((sum, item) => sum + item[key], 0) / values.length;
  const maximum = key => Math.max(...values.map(item => item[key]));
  rows.push({
    version, endpoint, run: Number(run), vus: 5, duration: '20s',
    requests: summary.metrics.http_reqs.count,
    throughput: summary.metrics.http_reqs.rate,
    averageMs: summary.metrics.http_req_duration.avg,
    p95Ms: summary.metrics.http_req_duration['p(95)'],
    errorRate: summary.metrics.http_req_failed.value * 100,
    averageCpu: average('cpu'), peakCpu: maximum('cpu'),
    averageMemoryMiB: average('memory'), peakMemoryMiB: maximum('memory')
  });
}

if (rows.length !== 18) throw new Error(`Expected 18 result files, got ${rows.length}`);
const headers = Object.keys(rows[0]);
const format = value => typeof value === 'number' ? Number(value.toFixed(3)) : value;
const csv = [headers.join(','), ...rows.map(row => headers.map(key => format(row[key])).join(','))].join('\n');
fs.writeFileSync(outputFile, `${csv}\n`);
console.log(`wrote ${rows.length} rows to ${outputFile}`);
