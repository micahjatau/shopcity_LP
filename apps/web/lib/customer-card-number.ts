type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function nonEmptyCardNumber(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Resolves legacy card aliases to one customer-facing card number. */
export function resolveCustomerCardNumber(value: unknown): string | null {
  const customer = asRecord(value);
  if (!customer) return null;

  const topLevel = [
    customer.cardNumber,
    customer.virtualCardNumber,
    customer.activeCardSerialNumber,
    customer.cardSerialNumber,
    customer.serialNumber,
    customer.barcodeValue,
  ];
  for (const candidate of topLevel) {
    const cardNumber = nonEmptyCardNumber(candidate);
    if (cardNumber) return cardNumber;
  }

  const nestedCards = [customer.activeCard, customer.card].map(asRecord);
  const listedCards = Array.isArray(customer.cards)
    ? customer.cards.map(asRecord)
    : [];
  const activeListedCards = listedCards.filter(
    (card) => card?.status === 'ACTIVE',
  );
  const nestedRecords = [
    ...nestedCards,
    ...activeListedCards,
    ...listedCards.filter((card) => card?.status !== 'ACTIVE'),
  ];

  for (const card of nestedRecords) {
    if (!card) continue;
    const candidates = [
      card.cardNumber,
      card.virtualCardNumber,
      card.cardSerialNumber,
      card.serialNumber,
      card.barcodeValue,
    ];
    for (const candidate of candidates) {
      const cardNumber = nonEmptyCardNumber(candidate);
      if (cardNumber) return cardNumber;
    }
  }

  return null;
}
