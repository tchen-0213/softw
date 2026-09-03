const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const required = [
  ['需求规格说明书', '02_docs/软件需求规格说明书.md'],
  ['概要设计说明书', '02_docs/软件概要设计说明书.md'],
  ['详细设计说明书', '02_docs/软件详细设计说明书.md'],
  ['测试计划', '02_docs/测试文档.md'],
  ['测试报告', '04_tests/reports/tests/测试报告-小学期.md'],
  ['回归记录', '04_tests/reports/tests/2026-09-03-功能测试部署完整复核.md'],
  ['追溯表', '02_docs/业务场景用例清单与追溯表.md'],
  ['部署文档', '03_devops/部署文档.md'],
  ['CI/CD', '.github/workflows/ci-cd.yml'],
  ['AI 与开源来源记录', '06_defense/AI工具与开源来源记录.md'],
  ['导出文件哈希清单', '06_defense/export/manifest.json'],
  ['README', 'README.md']
];
const result = { generatedAt: new Date().toISOString(), required: [], counts: {}, warnings: [] };

for (const [name, relative] of required) {
  const file = path.join(root, relative);
  const exists = fs.existsSync(file) && fs.statSync(file).size > 0;
  result.required.push({ name, path: relative, status: exists ? 'present' : 'missing' });
  if (!exists) result.warnings.push(`missing required deliverable: ${relative}`);
}

function count(extension, directories) {
  return directories.flatMap(directory => {
    const absolute = path.join(root, directory);
    if (!fs.existsSync(absolute)) return [];
    return fs.readdirSync(absolute, { recursive: true }).filter(file => String(file).toLowerCase().endsWith(extension));
  }).length;
}
result.counts = {
  markdown: count('.md', ['01_source', '02_docs', '03_devops', '04_tests', '05_management', '06_defense']),
  svg: count('.svg', ['02_docs']),
  yaml: count('.yaml', ['03_devops']),
  rawPerformanceReports: count('.txt', ['04_tests/reports/performance/raw']),
  exportedDocx: count('.docx', ['06_defense/export']),
  exportedPdf: count('.pdf', ['06_defense/export'])
};

const diagramNames = fs.readdirSync(path.join(root, '02_docs', 'images'));
for (let number = 1; number <= 42; number += 1) {
  const prefix = `${String(number).padStart(2, '0')}-`;
  if (!diagramNames.some(file => file.startsWith(prefix) && file.endsWith('.svg'))) result.warnings.push(`required diagram ${prefix}*.svg missing`);
}

const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
for (const directory of ['01_source', '02_docs', '03_devops', '04_tests', '05_management', '06_defense']) {
  const absolute = path.join(root, directory);
  for (const relative of fs.readdirSync(absolute, { recursive: true }).filter(file => String(file).endsWith('.md'))) {
    const file = path.join(absolute, relative);
    for (const match of fs.readFileSync(file, 'utf8').matchAll(linkPattern)) {
      const target = match[1].split(/\s+["']/)[0].split('#')[0];
      if (!target || /^(https?:|mailto:)/i.test(target)) continue;
      if (!fs.existsSync(path.resolve(path.dirname(file), decodeURIComponent(target)))) result.warnings.push(`broken link in ${path.relative(root, file)}: ${target}`);
    }
  }
}

if (result.counts.exportedDocx < 6) result.warnings.push('fewer than 6 exported DOCX files');
if (result.counts.exportedPdf < 6) result.warnings.push('fewer than 6 exported PDF files');

const secretPattern = /(gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY)/i;
for (const directory of ['.github', 'backend', 'frontend/src', 'services', '03_devops']) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) continue;
  for (const relative of fs.readdirSync(absolute, { recursive: true })) {
    const file = path.join(absolute, relative);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile() || file.includes(`${path.sep}node_modules${path.sep}`)) continue;
    if (secretPattern.test(fs.readFileSync(file, 'utf8')) && !file.endsWith('create-secrets.example.sh')) result.warnings.push(`possible credential in ${path.relative(root, file)}`);
  }
}

fs.writeFileSync(path.join(root, '04_tests/reports/deliverables-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (result.required.some(item => item.status === 'missing') || result.warnings.length) process.exitCode = 1;
