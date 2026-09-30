/**
 * Money utilities using integer minor units internally.
 *
 * Handles 0-decimal currencies (JPY, KRW) and 2-decimal (MYR, USD, EUR) via
 * the `currency` parameter. All math should use minor units.
 */

/** Decimal digits for a currency code (from CLDR data). */
const CURRENCY_DIGITS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  IDR: 0,
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  KMF: 0,
  MGA: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UZS: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
};

/** Default to 2 decimal places for unknown currencies. */
const DEFAULT_DIGITS = 2;

function decimalDigits(currency: string): number {
  return CURRENCY_DIGITS[currency.toUpperCase()] ?? DEFAULT_DIGITS;
}

/**
 * Convert a decimal amount to integer minor units for a given currency.
 * Handles 0-decimal currencies (returns amount unchanged).
 */
export function toMinor(amount: number, currency: string): number {
  const digits = decimalDigits(currency);
  const multiplier = Math.pow(10, digits);
  return Math.round(amount * multiplier);
}

/**
 * Convert integer minor units back to decimal for a given currency.
 */
export function fromMinor(minor: number, currency: string): number {
  const digits = decimalDigits(currency);
  const divisor = Math.pow(10, digits);
  return minor / divisor;
}

/**
 * Format a minor-unit amount as a human-readable string.
 * Uses Intl.NumberFormat for proper currency formatting.
 */
export function formatMoney(minor: number, currency: string, locale: string = 'en-MY'): string {
  const decimal = fromMinor(minor, currency);
  const digits = decimalDigits(currency);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(decimal);
}

/**
 * Round half-up to the correct number of decimal places for a currency.
 */
export function roundHalfUp(amount: number, currency: string): number {
  const digits = decimalDigits(currency);
  const factor = Math.pow(10, digits);
  return Math.floor(amount * factor + 0.5) / factor;
}

/**
 * Round half-up to integer minor units directly (avoids float math).
 */
export function roundHalfUpMinor(amount: number): number {
  return Math.floor(amount + 0.5);
}
