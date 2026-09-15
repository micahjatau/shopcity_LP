import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL ??=
  'postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity_test?schema=public';
const prisma = new PrismaClient();

function canonical(value: string): string {
  return value.trim().toUpperCase();
}

async function main(): Promise<void> {
  const cards = await prisma.card.findMany({
    select: { tenantId: true, id: true, barcodeValue: true },
    orderBy: [{ tenantId: 'asc' }, { barcodeValue: 'asc' }, { id: 'asc' }],
  });

  const groups = new Map<string, typeof cards>();
  let noncanonicalCount = 0;
  for (const card of cards) {
    const serial = card.barcodeValue ?? '';
    const normalized = canonical(serial);
    if (serial !== normalized) noncanonicalCount += 1;
    const key = `${card.tenantId}\u0000${normalized}`;
    const group = groups.get(key) ?? [];
    group.push(card);
    groups.set(key, group);
  }

  const collisions = [...groups.values()].filter((group) => group.length > 1);
  console.log(
    JSON.stringify(
      {
        cardCount: cards.length,
        noncanonicalCount,
        collisionGroupCount: collisions.length,
        collisions: collisions.map((group) => ({
          tenantId: group[0]?.tenantId,
          canonicalSerial: canonical(group[0]?.barcodeValue ?? ''),
          cardIds: group.map((card) => card.id),
        })),
      },
      null,
      2,
    ),
  );

  if (collisions.length > 0) process.exitCode = 2;
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : 'Card serial preflight failed',
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
