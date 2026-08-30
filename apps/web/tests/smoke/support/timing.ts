import { performance } from 'node:perf_hooks';

export async function measureWorkflow<T>(
  _name: string,
  action: () => Promise<T>,
): Promise<{ value: T; durationMs: number }> {
  const startedAt = performance.now();
  const value = await action();
  return {
    value,
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
  };
}
