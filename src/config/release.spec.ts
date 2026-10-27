import { resolveReleaseSha } from './release';

describe('resolveReleaseSha', () => {
  it('prefers the Vercel source revision over a stale configured release SHA', () => {
    expect(
      resolveReleaseSha({
        VERCEL_GIT_COMMIT_SHA: '  current-vercel-sha  ',
        GITHUB_SHA: 'github-sha',
        RELEASE_SHA: 'stale-sha',
      }),
    ).toBe('current-vercel-sha');
  });

  it('uses the GitHub source revision before the manual release SHA', () => {
    expect(
      resolveReleaseSha({ GITHUB_SHA: 'github-sha', RELEASE_SHA: 'stale-sha' }),
    ).toBe('github-sha');
  });

  it('falls back to the configured release SHA and then dev', () => {
    expect(resolveReleaseSha({ RELEASE_SHA: ' release-sha ' })).toBe(
      'release-sha',
    );
    expect(resolveReleaseSha({})).toBe('dev');
  });
});
