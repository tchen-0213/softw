const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('../frontend/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '06_defense', 'export');
const pandoc = process.env.PANDOC_PATH || path.join(process.env.LOCALAPPDATA || '', 'Pandoc', 'pandoc.exe');
const documents = [
  ['软件需求规格说明书', '02_docs/软件需求规格说明书.md'],
  ['软件概要设计说明书', '02_docs/软件概要设计说明书.md'],
  ['软件详细设计说明书', '02_docs/软件详细设计说明书.md'],
  ['测试计划', '02_docs/测试文档.md'],
  ['测试报告-小学期', '04_tests/reports/tests/测试报告-小学期.md'],
  ['业务场景用例清单与追溯表', '02_docs/业务场景用例清单与追溯表.md']
];
const css = `body{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif;line-height:1.65;color:#202124;max-width:900px;margin:36px auto;padding:0 30px}h1{font-size:28px;border-bottom:2px solid #333;padding-bottom:12px}h2{font-size:21px;margin-top:28px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #999;padding:6px;vertical-align:top}pre{white-space:pre-wrap;background:#f5f5f5;padding:10px}img,svg{max-width:100%;height:auto}@page{size:A4;margin:18mm}`;

async function run() {
  if (!fs.existsSync(pandoc)) throw new Error(`Pandoc not found: ${pandoc}`);
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const imageSource = path.join(root, '02_docs', 'images');
    const imageOutput = path.join(output, 'images');
    fs.mkdirSync(imageOutput, { recursive: true });
    for (const file of fs.readdirSync(imageSource).filter(file => file.endsWith('.svg'))) {
      await page.goto(`file:///${path.join(imageSource, file).replace(/\\/g, '/')}`, { waitUntil: 'load' });
      await page.locator('svg').screenshot({ path: path.join(imageOutput, file.replace(/\.svg$/, '.png')) });
    }
    for (const [name, source] of documents) {
      const input = path.join(root, source);
      const docx = path.join(output, `${name}.docx`);
      const html = path.join(output, `${name}.html`);
      const temporary = path.join(output, `${name}.source.md`);
      fs.writeFileSync(temporary, fs.readFileSync(input, 'utf8').replace(/images\/([^\s)]+)\.svg/g, 'images/$1.png'));
      execFileSync(pandoc, [temporary, '--from=gfm', '--to=docx', '--resource-path', output, '--output', docx]);
      fs.unlinkSync(temporary);
      execFileSync(pandoc, [input, '--from=gfm', '--to=html5', '--standalone', '--metadata', `title=${name}`, '--resource-path', path.dirname(input), '--output', html]);
      fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace('</head>', `<style>${css}</style></head>`));
      await page.goto(`file:///${html.replace(/\\/g, '/')}`, { waitUntil: 'load' });
      await page.pdf({ path: path.join(output, `${name}.pdf`), format: 'A4', printBackground: true });
    }
  } finally {
    await browser.close();
  }
  const manifest = { generatedAt: new Date().toISOString(), files: [] };
  for (const [name, source] of documents) {
    for (const relative of [source, `06_defense/export/${name}.docx`, `06_defense/export/${name}.pdf`]) {
      const buffer = fs.readFileSync(path.join(root, relative));
      manifest.files.push({ path: relative, bytes: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex') });
    }
  }
  fs.writeFileSync(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Exported ${documents.length} DOCX and ${documents.length} PDF files`);
}

run().catch(error => { console.error(error); process.exitCode = 1; });
