const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CODEARTS_URL = 'https://devcloud.cn-north-4.huaweicloud.com/home';
const PROJECT_NAME = '购物与二手交易平台小学期重构';
const REPO_URL = 'https://github.com/tchen-0213/softw.git';
const REPO_NAME = 'softw';
const PIPELINE_NAME = 'softw-ci';

const ROOT = path.resolve(__dirname, '..', '..');
const SCREENSHOT_DIR = path.join(ROOT, 'CodeArts截图');
const TASK_CSV = path.join(ROOT, 'CodeArts看板任务清单.csv');

const runAppleScript = (script) => execFileSync('osascript', ['-e', script], {
  encoding: 'utf8'
}).trim();

const openSafari = (url = CODEARTS_URL) => {
  runAppleScript(`
    tell application "Safari"
      activate
      if (count of windows) is 0 then
        make new document with properties {URL:"${url}"}
      else
        set URL of current tab of front window to "${url}"
      end if
    end tell
  `);
};

const waitForUser = async (message) => {
  process.stdout.write(`\n${message}\n完成后按回车继续...`);
  await new Promise(resolve => process.stdin.once('data', resolve));
};

const sanitizeFileName = (name) => name.replace(/[\\/:*?"<>|]/g, '-');

const screenshot = (name) => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const file = path.join(SCREENSHOT_DIR, `${sanitizeFileName(name)}.png`);
  execFileSync('screencapture', ['-x', file]);
  console.log(`已保存截图：${file}`);
};

const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map(item => item.trim());
};

const readTasks = () => {
  const lines = fs.readFileSync(TASK_CSV, 'utf8').trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
};

const printSetupValues = () => {
  console.log('\nCodeArts 填写信息');
  console.log(`项目名称：${PROJECT_NAME}`);
  console.log('开发模式：Scrum 或看板，优先 Scrum');
  console.log(`外部仓库地址：${REPO_URL}`);
  console.log(`仓库名称：${REPO_NAME}`);
  console.log('看板列：待办 / 进行中 / 代码评审 / 测试中 / 已完成');
  console.log(`流水线名称：${PIPELINE_NAME}`);
  console.log('\n流水线命令：');
  console.log('后端依赖安装：cd backend && npm ci');
  console.log('后端自动化测试：cd backend && npm test');
  console.log('前端构建：cd frontend && npm ci && npm run build');
};

const printTasks = () => {
  console.table(readTasks().map(task => ({
    编号: task['编号'],
    标题: task['标题'],
    类型: task['类型'],
    Sprint: task['Sprint'],
    负责人: task['负责人'],
    优先级: task['优先级']
  })));
};

const guide = async () => {
  printSetupValues();
  openSafari();

  await waitForUser('Safari 已打开 CodeArts。请完成华为云登录，停留在 CodeArts 首页。');
  screenshot('01-CodeArts首页');

  await waitForUser(`请创建项目：${PROJECT_NAME}，开发模式选择 Scrum 或看板，并邀请组员。`);
  screenshot('02-CodeArts项目首页');

  await waitForUser(`请进入“代码/代码托管 Repo”，导入外部仓库：${REPO_URL}，仓库名：${REPO_NAME}。`);
  screenshot('03-CodeArts仓库页面');

  console.log('\n请按下方任务清单在 CodeArts 工作项中创建任务：');
  printTasks();
  await waitForUser('请进入“工作项/看板/Scrum”，创建 Sprint、看板列和任务。');
  screenshot('04-CodeArts看板页面');

  await waitForUser(`请进入“流水线”，创建 ${PIPELINE_NAME}，配置后端 npm test 和前端 npm run build，运行成功后停留在结果页。`);
  screenshot('05-CodeArts流水线成功页面');

  await waitForUser('请打开 CodeArts 提交记录或缺陷/任务关闭记录页面。');
  screenshot('06-CodeArts提交或任务关闭记录');

  console.log(`\n已完成 Safari 辅助流程。截图目录：${SCREENSHOT_DIR}`);
};

const screenshotsOnly = async () => {
  openSafari();
  await waitForUser('请在 Safari 中打开需要归档的 CodeArts 页面。');
  screenshot(`CodeArts截图-${Date.now()}`);
};

const main = async () => {
  const command = process.argv[2] || 'guide';

  if (command === 'screenshots') {
    await screenshotsOnly();
    return;
  }

  await guide();
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
