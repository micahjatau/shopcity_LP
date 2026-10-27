interface ReleaseEnvironment {
  VERCEL_GIT_COMMIT_SHA?: string;
  GITHUB_SHA?: string;
  RELEASE_SHA?: string;
}

/** Prefer the platform's immutable source revision over manually configured metadata. */
export function resolveReleaseSha(env: ReleaseEnvironment): string {
  return (
    env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    env.GITHUB_SHA?.trim() ||
    env.RELEASE_SHA?.trim() ||
    'dev'
  );
}
