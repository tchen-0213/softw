const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TASK_CSV = path.join(ROOT, 'CodeArts看板任务清单.csv');
const PROJECT_ID = 'b95958aacf1047d99c5b703ba1b9c0f7';
const CREATE_URL = `https://devcloud.cn-north-4.huaweicloud.com/projectman/scrum/${PROJECT_ID}/task/workitem/task/create`;

const runAppleScript = (script) => execFileSync('osascript', ['-e', script], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe']
}).trim();

const runSafariJs = (js) => runAppleScript(`
  tell application "Safari"
    do JavaScript ${JSON.stringify(js)} in current tab of front window
  end tell
`);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

const waitForCreatePage = async () => {
  for (let index = 0; index < 30; index += 1) {
    const ready = runSafariJs(`
      Boolean(document.querySelector('textarea[placeholder*="标题"]') && document.querySelector('.ql-editor'))
    `);

    if (ready === 'true') {
      return;
    }

    await sleep(500);
  }

  throw new Error('等待新建工作项页面超时');
};

const createTask = async (task) => {
  const title = `${task['编号']} ${task['标题']}`;
  const description = [
    `类型：${task['类型']}`,
    `Sprint：${task['Sprint']}`,
    `负责人：${task['负责人']}`,
    `优先级：${task['优先级']}`,
    `验收标准：${task['验收标准']}`
  ].join('\n');

  runAppleScript(`
    tell application "Safari"
      set URL of current tab of front window to "${CREATE_URL}"
    end tell
  `);

  await waitForCreatePage();

  runSafariJs(`
    (() => {
      function setNativeValue(element, value) {
        const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
        descriptor.set.call(element, value);
        element.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: value
        }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const title = ${JSON.stringify(title)};
      const description = ${JSON.stringify(description)};
      const textarea = document.querySelector('textarea[placeholder*="标题"]');
      textarea.focus();
      setNativeValue(textarea, title);

      const editor = document.querySelector('.ql-editor');
      editor.focus();
      editor.innerHTML = description
        .split('\\n')
        .map(line => '<p>' + line + '</p>')
        .join('');
      editor.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: editor.innerText
      }));

      return textarea.value;
    })()
  `);

  await sleep(700);

  const result = runSafariJs(`
    (() => {
      const confirm = [...document.querySelectorAll('button')]
        .find(element => element.innerText.trim() === '确定' && element.className.includes('primary'));

      if (!confirm) {
        return 'confirm not found';
      }

      if (confirm.disabled) {
        return 'confirm disabled';
      }

      confirm.click();
      return 'submitted';
    })()
  `);

  if (result !== 'submitted') {
    throw new Error(`${title} 提交失败：${result || '无返回值'}`);
  }

  await sleep(4500);
  console.log(`已创建：${title}`);
};

const main = async () => {
  const onlyIds = new Set(
    process.argv
      .slice(2)
      .filter(argument => argument.startsWith('--only='))
      .flatMap(argument => argument.replace('--only=', '').split(',').map(item => item.trim()).filter(Boolean))
  );
  const createdIds = new Set(process.argv.slice(2).filter(argument => !argument.startsWith('--only=')));
  const defaultSkip = new Set(['CA-01', 'CA-02']);
  const tasks = readTasks().filter(task => (
    (onlyIds.size === 0 || onlyIds.has(task['编号']))
    && !defaultSkip.has(task['编号'])
    && !createdIds.has(task['编号'])
  ));

  for (const task of tasks) {
    await createTask(task);
  }

  runAppleScript(`
    tell application "Safari"
      set URL of current tab of front window to "https://devcloud.cn-north-4.huaweicloud.com/projectman/scrum/${PROJECT_ID}/workitem/list"
    end tell
  `);
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
