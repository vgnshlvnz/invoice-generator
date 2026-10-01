/**
 * Hook for filtering, sorting, and formatting the invoice index.
 */
import { useMemo } from 'react';
import type { InvoiceIndexEntry } from '../../domain';
import type { InvoiceFilter, InvoiceListItem } from './types';
import { formatTotal } from './types';

/**
 * Filter and sort the invoice index according to the given filter.
 */
export function filterAndSort(
  entries: InvoiceIndexEntry[],
  filter: InvoiceFilter,
): InvoiceListItem[] {
  let filtered = [...entries];

  // Search by number or client name
  if (filter.search) {
    const q = filter.search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.number.toLowerCase().includes(q) ||
        e.client.toLowerCase().includes(q),
    );
  }

  // Status filter
  if (filter.status !== 'all') {
    filtered = filtered.filter((e) => e.status === filter.status);
  }

  // Sort
  const dir = filter.direction === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    if (filter.sort === 'date') {
      return dir * a.updatedAt.localeCompare(b.updatedAt);
    }
    return dir * (a.total - b.total);
  });

  // Wrap in display items
  return filtered.map((e) => ({
    entry: e,
    totalFormatted: formatTotal(e.total),
  }));
}

/**
 * Hook wrapping filterAndSort over the app state.
 */
export function useInvoiceList(
  index: InvoiceIndexEntry[],
  filter: InvoiceFilter,
): InvoiceListItem[] {
  return useMemo(() => filterAndSort(index, filter), [index, filter]);
}
