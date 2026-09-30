import type { Invoice } from './schema';
import { toMinor, roundHalfUpMinor } from './money';

/** A single line in the computed totals. */
export interface ComputedLine {
  net: number;       // subtotal in minor units (before discount)
  discount: number;  // discount amount in minor units
  taxable: number;   // net - discount (amount subject to tax)
  tax: number;       // tax in minor units
  gross: number;     // taxable + tax (final line total)
}

/** Full computed totals result. */
export interface Totals {
  lines: ComputedLine[];
  subtotal: number;  // sum of line nets (before discount)
  discount: number;  // total discount amount
  taxTotal: number;  // sum of all line taxes
  total: number;     // grand total = sum of all line gross
}

/**
 * Compute all totals for an invoice.
 *
 * - Round half-up per line.
 * - Discount applies to subtotal before tax, prorated across lines
 *   for tax purposes (each line's discount share = line net / total net).
 */
export function computeTotals(invoice: Invoice): Totals {
  const lines: ComputedLine[] = [];
  let subtotalMinor = 0;

  // Step 1: compute line nets
  for (const item of invoice.items) {
    const net = roundHalfUpMinor(item.quantity * toMinor(item.unitPrice, invoice.currency));
    subtotalMinor += net;
  }

  // Step 2: compute total discount
  const discountValue = invoice.discount.value;
  let discountMinor = 0;
  if (invoice.discount.type === 'percent') {
    discountMinor = roundHalfUpMinor((subtotalMinor * discountValue) / 100);
  } else if (invoice.discount.type === 'amount') {
    discountMinor = toMinor(discountValue, invoice.currency);
  }
  // 'none' → 0

  // Step 3: compute per-line breakdown
  let taxTotal = 0;
  let total = 0;

  for (let i = 0; i < invoice.items.length; i++) {
    const item = invoice.items[i];
    const net = roundHalfUpMinor(item.quantity * toMinor(item.unitPrice, invoice.currency));

    // Prorate discount across lines by net share
    let lineDiscount = 0;
    if (subtotalMinor > 0) {
      lineDiscount = roundHalfUpMinor((net / subtotalMinor) * discountMinor);
    }

    const taxable = net - lineDiscount;
    const tax = roundHalfUpMinor((taxable * item.taxRate) / 100);
    const gross = taxable + tax;

    lines.push({ net, discount: lineDiscount, taxable, tax, gross });
    taxTotal += tax;
    total += gross;
  }

  return { lines, subtotal: subtotalMinor, discount: discountMinor, taxTotal, total };
}
