import { BadRequestException } from '@nestjs/common';

export type CursorPageRequest = {
  limit: number;
  cursor?: string;
};

export type DecodedCursor = {
  id: string;
  timestamp: string;
};

export function parseCursorPageRequest(
  limitValue?: string,
  cursor?: string,
  defaultLimit = 50,
  maxLimit = 100,
): CursorPageRequest {
  const parsedLimit = limitValue ? Number(limitValue) : defaultLimit;

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    throw new BadRequestException(
      'Pagination limit must be a positive integer',
    );
  }

  return {
    limit: Math.min(parsedLimit, maxLimit),
    cursor,
  };
}

export function decodeCursor(cursor: string): DecodedCursor {
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as Partial<DecodedCursor>;

    if (!decoded.id || !decoded.timestamp) {
      throw new Error('Invalid cursor');
    }

    return { id: decoded.id, timestamp: decoded.timestamp };
  } catch {
    throw new BadRequestException('Pagination cursor is invalid');
  }
}

export function encodeCursor(id: string, timestamp: Date | string): string {
  const value =
    typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
  return Buffer.from(JSON.stringify({ id, timestamp: value })).toString(
    'base64url',
  );
}

export function pageMeta<T>(items: T[], limit: number) {
  return {
    pageItems: items.slice(0, limit),
    hasMore: items.length > limit,
  };
}
