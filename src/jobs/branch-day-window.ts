export interface BranchDayWindow {
  windowStart: Date;
  windowEnd: Date;
}

export function branchDayWindow(
  reference: Date,
  timeZone: string,
): BranchDayWindow {
  const { year, month, day } = localDateParts(reference, timeZone);
  const windowStart = localMidnightUtc(timeZone, year, month, day);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  const windowEnd = localMidnightUtc(
    timeZone,
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth() + 1,
    nextDay.getUTCDate(),
  );

  return { windowStart, windowEnd };
}

function localMidnightUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
): Date {
  const targetUtcMillis = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  let guess = targetUtcMillis;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const actual = localDateTimeParts(new Date(guess), timeZone);
    const actualUtcMillis = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const delta = actualUtcMillis - targetUtcMillis;

    if (delta === 0) {
      return new Date(guess);
    }

    guess -= delta;
  }

  return new Date(guess);
}

function localDateParts(
  value: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value ?? '0'),
    month: Number(parts.find((part) => part.type === 'month')?.value ?? '0'),
    day: Number(parts.find((part) => part.type === 'day')?.value ?? '0'),
  };
}

function localDateTimeParts(
  value: Date,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(value);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value ?? '0'),
    month: Number(parts.find((part) => part.type === 'month')?.value ?? '0'),
    day: Number(parts.find((part) => part.type === 'day')?.value ?? '0'),
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? '0'),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? '0'),
    second: Number(parts.find((part) => part.type === 'second')?.value ?? '0'),
  };
}
