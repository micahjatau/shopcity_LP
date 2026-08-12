#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const summaryPath = resolve(args.summary ?? 'tmp/k6-pilot-summary.json');
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));

assertThreshold(summary, 'http_req_failed', (metric) => metric.rate < 0.01);
assertThreshold(summary, 'synthetic_failure_rate', (metric) => metric.rate < 0.01);
assertTrend(summary, 'http_req_duration{scenario:card_lookup}', (metric) => metric['p(95)'] < 500);
assertTrend(summary, 'http_req_duration{scenario:earn_checkout}', (metric) => metric['p(95)'] < 1200);
assertTrend(summary, 'http_req_duration{scenario:redeem_checkout}', (metric) => metric['p(95)'] < 1200);
assertCounter(summary, 'invariant_check_failures', (metric) => metric.count === 0);

console.log(`k6 summary validated: ${summaryPath}`);

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      result[key] = next;
      index += 1;
    } else {
      result[key] = 'true';
    }
  }
  return result;
}

function assertThreshold(summary, name, predicate) {
  const metric = summary.metrics?.[name]?.values;
  if (!metric || !predicate(metric)) {
    throw new Error(`threshold failed for ${name}`);
  }
}

function assertTrend(summary, name, predicate) {
  const metric = summary.metrics?.[name]?.values;
  if (!metric || !predicate(metric)) {
    throw new Error(`trend threshold failed for ${name}`);
  }
}

function assertCounter(summary, name, predicate) {
  const metric = summary.metrics?.[name]?.values;
  if (!metric || !predicate(metric)) {
    throw new Error(`counter threshold failed for ${name}`);
  }
}
