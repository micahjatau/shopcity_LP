#!/usr/bin/env node

const { existsSync } = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const localRunner = path.join(process.cwd(), '.gitnexus', 'run.cjs');
const localBinary = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'gitnexus.cmd' : 'gitnexus',
);
const timeoutMs = 10 * 60 * 1000;

function run(command, commandArgs) {
  return spawnSync(command, commandArgs, {
    stdio: 'inherit',
    timeout: timeoutMs,
  });
}

if (existsSync(localRunner)) {
  const result = run(process.execPath, [localRunner, ...args]);
  process.exit(result.error || result.signal || result.status !== 0 ? 1 : 0);
}

if (existsSync(localBinary)) {
  const result = run(localBinary, args);
  process.exit(result.error || result.signal || result.status !== 0 ? 1 : 0);
}

console.error(
  'Unable to run GitNexus. Install the pinned dependency or generate .gitnexus/run.cjs.',
);

process.exit(1);
