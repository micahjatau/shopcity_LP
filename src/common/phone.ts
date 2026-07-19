export function normalizePhoneToE164(
  value: string,
  defaultCountryCode = '+234',
): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return value;
  }

  if (value.trim().startsWith('+')) {
    return `+${digits}`;
  }

  if (digits.startsWith('234') && digits.length >= 13) {
    return `+${digits}`;
  }

  if (digits.startsWith('0')) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }

  return `${defaultCountryCode}${digits}`;
}
