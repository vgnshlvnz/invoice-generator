/**
 * Invoice numbering with pattern-based generation.
 *
 * Tokens: {YYYY}, {YY}, {MM}, {SEQ:width}
 * Default: "INV-{YYYY}-{SEQ:4}"
 */

/** Format a number with zero-padding to the given width. */
function padSeq(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

/** Format a Date as YYYY, YY, or MM. */
function fmtYear(date: Date): string {
  return String(date.getFullYear());
}

function fmtShortYear(date: Date): string {
  return String(date.getFullYear()).slice(-2);
}

function fmtMonth(date: Date): string {
  const m = date.getMonth() + 1;
  return String(m).padStart(2, '0');
}

/**
 * Generate the next invoice number from a pattern.
 *
 * @param pattern — e.g. "INV-{YYYY}-{SEQ:4}"
 * @param lastSeq — the last used sequence number (next will be lastSeq + 1)
 * @param date — the date to use for year/month tokens
 * @returns the formatted invoice number
 */
export function nextInvoiceNumber(
  pattern: string,
  lastSeq: number,
  date: Date = new Date(),
): string {
  const nextSeq = lastSeq + 1;
  let result = pattern;

  result = result.replace(/\{YYYY\}/g, fmtYear(date));
  result = result.replace(/\{YY\}/g, fmtShortYear(date));
  result = result.replace(/\{MM\}/g, fmtMonth(date));
  result = result.replace(/\{SEQ:(\d+)\}/g, (_, width) => padSeq(nextSeq, parseInt(width, 10)));

  return result;
}

/** Default invoice number pattern. */
export const DEFAULT_PATTERN = 'INV-{YYYY}-{SEQ:4}';
