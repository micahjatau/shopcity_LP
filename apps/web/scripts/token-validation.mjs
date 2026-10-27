export function createTokenResolver(rawTokens) {
  function resolveToken(value, stack = []) {
    if (typeof value !== 'string') {
      return value;
    }

    const aliasMatch = value.match(/^\{(.+)\}$/);
    if (!aliasMatch) {
      return value;
    }

    const aliasName = `--sc-${aliasMatch[1].split('.').join('-')}`;
    if (!rawTokens.has(aliasName)) {
      throw new Error(`Unknown design token alias: ${value}`);
    }
    if (stack.includes(aliasName)) {
      throw new Error(
        `Cyclic design token alias: ${[...stack, aliasName].join(' -> ')}`,
      );
    }

    const resolved = resolveToken(rawTokens.get(aliasName), [
      ...stack,
      aliasName,
    ]);
    return typeof resolved === 'string' && resolved.startsWith('var(')
      ? resolved
      : `var(${aliasName})`;
  }

  return resolveToken;
}
