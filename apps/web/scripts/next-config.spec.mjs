import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

for (const mode of ['development', 'production']) {
  test(`CSP framing policy in ${mode}`, () => {
    const configUrl = new URL('../next.config.mjs', import.meta.url).href;
    const headers = JSON.parse(
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `const { default: config } = await import(${JSON.stringify(configUrl)}); console.log(JSON.stringify(await config.headers()));`,
        ],
        { env: { ...process.env, NODE_ENV: mode }, encoding: 'utf8' },
      ),
    );
    const policy = headers[0].headers.find(
      (header) => header.key === 'Content-Security-Policy',
    ).value;
    const directives = policy.split('; ');
    assert.ok(directives.includes("frame-src 'none'"));
    assert.ok(directives.includes("object-src 'none'"));
    if (mode === 'production') {
      assert.ok(directives.includes("frame-ancestors 'none'"));
      assert.ok(directives.includes('upgrade-insecure-requests'));
      assert.ok(!policy.includes("'unsafe-eval'"));
    } else {
      assert.ok(!directives.some((value) => value.startsWith('frame-ancestors')));
      assert.ok(!directives.includes('upgrade-insecure-requests'));
      assert.ok(policy.includes("'unsafe-eval'"));
    }
  });
}
