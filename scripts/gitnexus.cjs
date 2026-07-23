#!/usr/bin/env node

const { existsSync } = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const localRunner = path.join(process.cwd(), '.gitnexus', 'run.cjs');

function run(command, commandArgs) {
  return spawnSync(command, commandArgs, { stdio: 'inherit' });
}

if (existsSync(localRunner)) {
  const result = run(process.execPath, [localRunner, ...args]);
  process.exit(result.status ?? 0);
}

let result = run('gitnexus', args);

if (result.error && result.error.code === 'ENOENT') {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  result = run(npx, ['--yes', 'gitnexus', ...args]);
}

if (result.error) {
  console.error('Unable to run GitNexus. Install it locally or generate .gitnexus/run.cjs.');
  process.exit(1);
}

process.exit(result.status ?? 0);
