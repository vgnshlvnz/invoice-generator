import { generateId } from './ids';
import type { Invoice, Seller } from './schema';

/** Defaults for an empty invoice when no profile is provided. */
const DEFAULT_PAYMENT_TERMS_DAYS = 14;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Create an empty draft invoice.
 *
 * @param profile — optional seller defaults + numbering settings
 * @param now — defaults to today; used for issue/due dates
 * @returns a valid draft invoice
 */
export function createEmptyInvoice(
  profile?: { seller: Seller; numbering: { prefix: string; yearStart: number; sequenceStart: number } },
  now = new Date(),
): Invoice {
  const seller = profile?.seller ?? {
    name: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    bank: { name: '', accountName: '', accountNumber: '' },
  };

  const paymentDays = profile?.numbering
    ? DEFAULT_PAYMENT_TERMS_DAYS
    : DEFAULT_PAYMENT_TERMS_DAYS;

  const due = new Date(now);
  due.setDate(due.getDate() + paymentDays);

  return {
    schemaVersion: 1,
    id: generateId(),
    number: '',
    status: 'draft',
    currency: 'MYR',
    issueDate: isoDate(now),
    dueDate: isoDate(due),
    seller,
    client: { name: '', email: '', address: '', taxId: '' },
    items: [{ id: generateId(), description: '', quantity: 1, unitPrice: 0, taxRate: 0 }],
    discount: { type: 'none', value: 0 },
    notes: '',
    terms: '',
  };
}
