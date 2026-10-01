import type { InvoiceIndexEntry, InvoiceStatus } from '../../domain';

/** Filter and sort parameters for the invoice list. */
export interface InvoiceFilter {
  search: string;
  status: 'all' | InvoiceStatus;
  sort: 'date' | 'total';
  direction: 'asc' | 'desc';
}

/** A filtered/sorted row ready for display. */
export interface InvoiceListItem {
  entry: InvoiceIndexEntry;
  /** Formatted total in display string, e.g. "MYR 1,234.56". */
  totalFormatted: string;
}

/** Format minor-unit integer to a display string. */
export function formatTotal(amount: number, currency = 'MYR'): string {
  const value = amount / 100;
  return `${currency} ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
