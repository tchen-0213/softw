const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('../frontend/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '06_defense', 'export');
const python = process.env.CODEX_PYTHON_PATH || 'python';
const documents = [
  ['软件需求规格说明书', '02_docs/软件需求规格说明书.md', '02-需求规格说明书'],
  ['软件概要设计说明书', '02_docs/软件概要设计说明书.md', '02-概要设计说明书'],
  ['软件详细设计说明书', '02_docs/软件详细设计说明书.md', '02-详细设计说明书'],
  ['测试计划', '02_docs/测试文档.md', '02-测试计划', '测试文档'],
  ['测试报告-小学期', '04_tests/reports/tests/测试报告-小学期.md', '04-测试报告'],
  ['业务场景用例清单与追溯表', '02_docs/业务场景用例清单与追溯表.md', '02-业务场景用例清单与追溯表'],
  ['第1天业务场景清单与确认表', '02_docs/第1天业务场景清单与确认表.md', '02-第1天业务场景清单与确认表'],
  ['微服务拆分设计', '02_docs/微服务拆分设计.md', '02-微服务拆分设计'],
  ['微服务接口与数据归属', '02_docs/微服务接口与数据归属.md', '02-微服务接口与数据归属'],
  ['性能对比实验报告', '04_tests/reports/performance/性能对比实验报告.md', '04-性能对比实验报告'],
  ['技术总结报告', '06_defense/技术总结报告.md', '06-技术总结报告'],
  ['最终交付核查清单', '06_defense/最终交付核查清单.md', '06-最终交付核查清单'],
  ['答辩提纲', '06_defense/答辩提纲.md', '06-答辩提纲'],
  ['个人权重表', '05_management/个人权重表.md', '05-个人权重表'],
  ['全员确认记录', '05_management/全员确认记录.md', '05-全员确认记录']
];
const css = `body{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif;line-height:1.65;color:#202124;max-width:900px;margin:36px auto;padding:0 30px}h1{font-size:28px;border-bottom:2px solid #333;padding-bottom:12px}h2{font-size:21px;margin-top:28px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #999;padding:6px;vertical-align:top}pre{white-space:pre-wrap;background:#f5f5f5;padding:10px}img,svg{max-width:100%;height:auto}@page{size:A4;margin:18mm}`;

function writeManifest() {
  const manifest = { generatedAt: new Date().toISOString(), files: [] };
  for (const [name, source] of documents) {
    for (const relative of [source, `06_defense/export/${name}.docx`, `06_defense/export/${name}.pdf`]) {
      const buffer = fs.readFileSync(path.join(root, relative));
      manifest.files.push({ path: relative, bytes: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex') });
    }
  }
  fs.writeFileSync(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function run() {
  fs.mkdirSync(output, { recursive: true });
  if (process.env.MANIFEST_ONLY === '1') {
    writeManifest();
    return;
  }
  const requestedNames = (process.env.EXPORT_DOCUMENTS || '').split(',').filter(Boolean);
  const selectedDocuments = requestedNames.length
    ? documents.filter(([name]) => requestedNames.includes(name))
    : documents;
  if (requestedNames.some(name => !documents.some(([known]) => known === name))) {
    throw new Error('EXPORT_DOCUMENTS contains an unknown document name');
  }
  const { marked } = await import('marked');
  execFileSync(python, [path.join(root, '02_docs', 'pdf', 'export_submission_pack.py')], {
    cwd: root,
    env: { ...process.env, DOCX_ONLY: '1', DOCX_DOCUMENTS: selectedDocuments.map(([, , stem]) => stem).join(',') },
    stdio: 'inherit'
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const [name, source, submissionName, pdfMirrorName = name] of selectedDocuments) {
      const input = path.join(root, source);
      const docx = path.join(output, `${name}.docx`);
      const pdf = path.join(output, `${name}.pdf`);
      const html = path.join(output, `${name}.html`);
      const submissionDir = path.join(root, '提交包');
      fs.copyFileSync(path.join(submissionDir, `${submissionName}.docx`), docx);
      const body = marked.parse(fs.readFileSync(input, 'utf8'));
      const base = pathToFileURL(`${path.dirname(input)}${path.sep}`).href;
      fs.writeFileSync(html, `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><base href="${base}"><title>${name}</title><style>${css}</style></head><body>${body}</body></html>`);
      await page.goto(`file:///${html.replace(/\\/g, '/')}`, { waitUntil: 'load' });
      await page.pdf({ path: pdf, format: 'A4', printBackground: true });
      fs.mkdirSync(submissionDir, { recursive: true });
      fs.copyFileSync(pdf, path.join(submissionDir, `${submissionName}.pdf`));
      if (!['个人权重表', '全员确认记录'].includes(name)) {
        const pdfMirrorDir = path.join(root, '02_docs', 'pdf');
        fs.mkdirSync(pdfMirrorDir, { recursive: true });
        fs.copyFileSync(pdf, path.join(pdfMirrorDir, `${pdfMirrorName}.pdf`));
      }
    }
  } finally {
    await browser.close();
  }
  writeManifest();
  console.log(`Exported ${selectedDocuments.length} DOCX and ${selectedDocuments.length} PDF files`);
}

run().catch(error => { console.error(error); process.exitCode = 1; });
