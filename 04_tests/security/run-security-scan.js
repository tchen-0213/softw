const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..');
const npmCommand = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';
const packageDirectories = [
  'backend',
  'frontend',
  'services/api-gateway',
  'services/user-service',
  'services/product-service',
  'services/order-service'
];
const excluded = [
  /(^|\/)package-lock\.json$/,
  /(^|\/)uploads\//,
  /(^|\/)assets\//,
  /(^|\/)reports\//,
  /\.test\.js$/,
  /\.(?:png|jpe?g|gif|webp|pdf|docx?|xlsx?|zip)$/i
];
const secretPatterns = [
  { name: 'private-key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'github-token', regex: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { name: 'aws-access-key', regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'slack-token', regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { name: 'credentialed-url', regex: /\b(?:mysql|postgres(?:ql)?|mongodb(?:\+srv)?):\/\/[^\s/:]+:[^\s@]+@/gi },
  { name: 'literal-service-secret', regex: /\b(?:JWT_SECRET|DB_PASSWORD|MYSQL_ROOT_PASSWORD|INTERNAL_SERVICE_TOKEN)\s*[:=]\s*["']?([A-Za-z0-9_+\/-]{16,})["']?/g }
];

function trackedFiles() {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

function scanSecrets() {
  const findings = [];
  for (const relativePath of trackedFiles()) {
    const normalized = relativePath.replace(/\\/g, '/');
    if (excluded.some(pattern => pattern.test(normalized))) continue;
    const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
    for (const pattern of secretPatterns) {
      pattern.regex.lastIndex = 0;
      for (const match of content.matchAll(pattern.regex)) {
        const value = match[1] || match[0];
        if (/^(?:example|sample|test|placeholder|change|your|strong)/i.test(value)) continue;
        const line = content.slice(0, match.index).split(/\r?\n/).length;
        findings.push({ file: normalized, line, type: pattern.name });
      }
    }
  }
  return findings;
}

function auditDependencies() {
  return packageDirectories.map(directory => {
    const npmArguments = ['audit', '--omit=dev', '--audit-level=high', '--registry=https://registry.npmjs.org', '--json'];
    const commandArguments = process.platform === 'win32'
      ? ['/d', '/s', '/c', `npm ${npmArguments.join(' ')}`]
      : npmArguments;
    const result = spawnSync(npmCommand, commandArguments, {
      cwd: path.join(root, directory),
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });
    if (result.error) {
      return { directory, error: result.error.message, high: null, critical: null };
    }
    let report;
    try {
      report = JSON.parse(result.stdout || '{}');
    } catch (error) {
      return { directory, error: String(result.stderr || error.message).trim(), high: null, critical: null };
    }
    if (!report.metadata?.vulnerabilities) {
      const message = report.error?.summary || result.stderr || `npm audit exited ${result.status}`;
      return { directory, error: String(message).trim(), high: null, critical: null };
    }
    const vulnerabilities = report.metadata?.vulnerabilities || {};
    return {
      directory,
      high: Number(vulnerabilities.high || 0),
      critical: Number(vulnerabilities.critical || 0),
      moderate: Number(vulnerabilities.moderate || 0),
      total: Number(vulnerabilities.total || 0)
    };
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  secretScan: {
    trackedFiles: trackedFiles().length,
    findings: scanSecrets()
  },
  dependencyAudit: auditDependencies()
};
report.passed = report.secretScan.findings.length === 0
  && report.dependencyAudit.every(item => !item.error && item.high === 0 && item.critical === 0);

const outputArg = process.argv.find(argument => argument.startsWith('--output='));
if (outputArg) {
  const outputPath = path.resolve(root, outputArg.slice('--output='.length));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
