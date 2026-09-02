const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');

const containerName = `softw-service-test-${process.pid}`;
const password = randomBytes(18).toString('hex');
const jwtSecret = randomBytes(24).toString('hex');
const internalToken = randomBytes(24).toString('hex');

function execute(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
    throw new Error(`${command} ${args.join(' ')} failed${output ? `\n${output}` : ''}`);
  }
  return result;
}

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function waitForMysql() {
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    const result = execute('docker', [
      'exec', containerName, 'mysqladmin', 'ping', '-h', '127.0.0.1', '-uroot', `-p${password}`, '--silent'
    ], { allowFailure: true });
    if (result.status === 0) return;
    await delay(1000);
  }
  throw new Error('一次性 MySQL 在40秒内未就绪');
}

async function main() {
  execute('docker', ['version', '--format', '{{.Server.Version}}']);
  execute('docker', [
    'run', '--rm', '-d', '--name', containerName,
    '-e', `MYSQL_ROOT_PASSWORD=${password}`,
    '-e', 'MYSQL_DATABASE=softw_test',
    '-e', 'MYSQL_USER=softw',
    '-e', `MYSQL_PASSWORD=${password}`,
    '-p', '127.0.0.1::3306',
    'mysql:8.0'
  ]);

  await waitForMysql();
  const portOutput = execute('docker', ['port', containerName, '3306/tcp']).stdout.trim();
  const portMatch = portOutput.match(/:(\d+)$/);
  if (!portMatch) throw new Error(`无法解析一次性 MySQL 端口: ${portOutput}`);

  const env = {
    ...process.env,
    NODE_ENV: 'test',
    DB_HOST: '127.0.0.1',
    DB_PORT: portMatch[1],
    DB_NAME: 'softw_test',
    DB_USER: 'softw',
    DB_PASSWORD: password,
    JWT_SECRET: jwtSecret,
    INTERNAL_SERVICE_TOKEN: internalToken,
    RATE_LIMIT_MAX: '1000'
  };

  for (const service of ['user-service', 'product-service', 'order-service', 'api-gateway']) {
    const npmArgs = ['--prefix', `services/${service}`, 'test'];
    const result = process.env.npm_execpath
      ? spawnSync(process.execPath, [process.env.npm_execpath, ...npmArgs], { cwd: process.cwd(), env, stdio: 'inherit' })
      : spawnSync('npm', npmArgs, { cwd: process.cwd(), env, stdio: 'inherit', shell: process.platform === 'win32' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${service} 测试失败`);
  }
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    execute('docker', ['rm', '-f', containerName], { allowFailure: true });
  });
