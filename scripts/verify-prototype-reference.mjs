#!/usr/bin/env node
import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const referenceRoot = join(root, 'apps', 'web', 'public', 'prototype');
const prohibitedRootNames = new Set([
  'capture-purchase.html',
  'find-customer.html',
  'global.css',
  'login-page.html',
  'overview-dashboard.html',
  'prototype-ui.js',
  'redeem-credit.html',
  'register-customer.html',
  'transactions-dashboard.html',
  'workflow-states.html',
]);

if (!existsSync(referenceRoot)) {
  throw new Error(`Prototype reference directory is missing: ${referenceRoot}`);
}

const rootDuplicates = readdirSync(root).filter(
  (name) => prohibitedRootNames.has(name) || name.endsWith('.artifact.json'),
);
if (rootDuplicates.length > 0) {
  throw new Error(
    `Duplicate root-level prototype assets found: ${rootDuplicates.join(', ')}`,
  );
}

const referenceFiles = readdirSync(referenceRoot).filter((name) =>
  /\.(html|css|js)$/.test(name),
);
if (referenceFiles.length === 0) {
  throw new Error(`No prototype reference assets found in ${referenceRoot}`);
}

console.log(
  `Prototype reference OK: ${relative(root, referenceRoot)} (${referenceFiles.length} assets)`,
);
