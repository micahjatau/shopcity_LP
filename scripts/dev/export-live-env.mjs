#!/usr/bin/env node
import fs from 'node:fs';

const file = process.argv[2];
const keys = process.argv.slice(3);

if (!file || keys.length === 0) {
  process.exit(0);
}

const wanted = new Set(keys);
const seen = new Set();
const text = fs.readFileSync(file, 'utf8');

for (const line of text.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) continue;

  const [, key, raw] = match;
  if (!wanted.has(key) || seen.has(key)) continue;
  seen.add(key);

  const value = raw.replace(/^"|"$/g, '');
  const escaped = value.replace(/'/g, `'"'"'`);
  process.stdout.write(`export ${key}='${escaped}'\n`);
}
