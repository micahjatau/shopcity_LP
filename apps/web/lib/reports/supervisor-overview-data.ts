export function businessDateInTimezone(
  timeZone: string,
  instant: Date = new Date(),
): string | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instant);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '';
    const year = value('year');
    const month = value('month');
    const day = value('day');
    return year && month && day ? `${year}-${month}-${day}` : null;
  } catch {
    return null;
  }
}

export function isReportForBusinessDate(
  reportDate: unknown,
  timeZone: string,
  instant: Date = new Date(),
): boolean {
  if (typeof reportDate !== 'string') return false;
  const datePart = /^\d{4}-\d{2}-\d{2}/.exec(reportDate)?.[0];
  const businessDate = businessDateInTimezone(timeZone, instant);
  return (
    datePart !== undefined && businessDate !== null && datePart === businessDate
  );
}
