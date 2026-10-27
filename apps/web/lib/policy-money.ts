export function formatBasisPointsAsPercent(bps: number) {
  const digits = String(bps).padStart(3, '0');
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

export function parsePercentAsBasisPoints(value: string) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const hundredths = Number(`${match[1]}${(match[2] ?? '').padEnd(2, '0')}`);
  return Number.isSafeInteger(hundredths) && hundredths <= 10000
    ? hundredths
    : null;
}
