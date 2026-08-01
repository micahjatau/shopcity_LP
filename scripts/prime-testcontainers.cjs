#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const images = process.env.TESTCONTAINERS_IMAGES
  ? process.env.TESTCONTAINERS_IMAGES.split(',')
      .map((image) => image.trim())
      .filter(Boolean)
  : ['postgres:16-alpine'];

const retries = Number(process.env.TESTCONTAINERS_PRIME_RETRIES ?? '3');

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      throw new Error(
        'Docker is required to prime Testcontainers images, but the docker CLI was not found.',
      );
    }

    throw result.error;
  }

  return result;
}

function imageExists(image) {
  const result = run('docker', ['image', 'inspect', image]);
  return result.status === 0;
}

function pullImage(image) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const result = run('docker', ['pull', image]);
    if (result.status === 0) {
      process.stdout.write(result.stdout);
      return;
    }

    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .join('\n')
      .trim();
    process.stderr.write(
      `docker pull ${image} failed on attempt ${attempt}/${retries}\n`,
    );
    if (output) {
      process.stderr.write(`${output}\n`);
    }

    if (attempt < retries) {
      process.stderr.write('Retrying image hydration...\n');
    }
  }

  throw new Error(
    `Unable to hydrate Testcontainers image ${image}. Check Docker access or mirror availability before running integration tests.`,
  );
}

for (const image of images) {
  if (!imageExists(image)) {
    pullImage(image);
  }
}
