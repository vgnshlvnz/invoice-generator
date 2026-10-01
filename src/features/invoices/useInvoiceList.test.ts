/**
 * Tests for invoice list filtering, import validation, and export.
 */
import { describe, it, expect } from 'vitest';
import { fromYaml, createEmptyInvoice } from '../../domain';
import { filterAndSort } from './useInvoiceList';
import type { InvoiceFilter } from './types';

/** Create a minimal invoice index for testing. */
function makeEntries(count: number): { id: string; number: string; client: string; total: number; status: 'draft' | 'sent' | 'paid' | 'void'; updatedAt: string }[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `inv_000${i}`,
    number: `INV-2026-${String(i + 1).padStart(4, '0')}`,
    client: `Client ${i + 1}`,
    total: (i + 1) * 100000, // minor units
    status: (['draft', 'sent', 'paid'] as const)[i % 3],
    updatedAt: `2026-10-${String(i + 1).padStart(2, '0')}`,
  }));
}

describe('filterAndSort', () => {
  const entries = makeEntries(6);

  it('filters by search query (number)', () => {
    const filter: InvoiceFilter = { search: '0001', status: 'all', sort: 'date', direction: 'desc' };
    const result = filterAndSort(entries, filter);
    expect(result).toHaveLength(1);
    expect(result[0].entry.number).toBe('INV-2026-0001');
  });

  it('filters by search query (client)', () => {
    const filter: InvoiceFilter = { search: 'Client 3', status: 'all', sort: 'date', direction: 'desc' };
    const result = filterAndSort(entries, filter);
    expect(result).toHaveLength(1);
    expect(result[0].entry.client).toBe('Client 3');
  });

  it('filters by status', () => {
    const filter: InvoiceFilter = { search: '', status: 'draft', sort: 'date', direction: 'desc' };
    const result = filterAndSort(entries, filter);
    expect(result.every((r) => r.entry.status === 'draft')).toBe(true);
  });

  it('filters by status all', () => {
    const filter: InvoiceFilter = { search: '', status: 'all', sort: 'date', direction: 'desc' };
    const result = filterAndSort(entries, filter);
    expect(result).toHaveLength(6);
  });

  it('sorts by date descending', () => {
    const filter: InvoiceFilter = { search: '', status: 'all', sort: 'date', direction: 'desc' };
    const result = filterAndSort(entries, filter);
    expect(result[0].entry.updatedAt).toBe('2026-10-06');
  });

  it('sorts by date ascending', () => {
    const filter: InvoiceFilter = { search: '', status: 'all', sort: 'date', direction: 'asc' };
    const result = filterAndSort(entries, filter);
    expect(result[0].entry.updatedAt).toBe('2026-10-01');
  });

  it('sorts by total descending', () => {
    const filter: InvoiceFilter = { search: '', status: 'all', sort: 'total', direction: 'desc' };
    const result = filterAndSort(entries, filter);
    expect(result[0].entry.total).toBe(600000);
  });
});

describe('formatTotal', () => {
  it('formats minor units to display string', () => {
    const filter: InvoiceFilter = { search: '', status: 'all', sort: 'date', direction: 'desc' };
    const result = filterAndSort(makeEntries(1), filter);
    // 100000 minor units = 1000.00
    expect(result[0].totalFormatted).toBe('MYR 1,000.00');
  });

  it('uses default currency MYR', () => {
    const filter: InvoiceFilter = { search: '', status: 'all', sort: 'date', direction: 'desc' };
    const result = filterAndSort(makeEntries(1), filter);
    expect(result[0].totalFormatted).toContain('MYR');
  });
});

describe('import rejects invalid YAML', () => {
  it('rejects a file with invalid invoice status', () => {
    const result = fromYaml(`schemaVersion: 1
id: inv_bad
number: INV-2026-9999
status: invalid_status
currency: MYR
issueDate: 2026-10-01
dueDate: 2026-10-15
seller:
  name: Test
  email: a@b.com
  phone: ""
  address: ""
  taxId: ""
  bank:
    name: ""
    accountName: ""
    accountNumber: ""
client:
  name: Client
  email: c@d.com
  address: ""
  taxId: ""
items:
  - id: i1
    description: Widget
    quantity: 1
    unitPrice: 10
    taxRate: 0
discount:
  type: none
  value: 0
notes: ""
terms: ""
`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path.includes('status'))).toBe(true);
    }
  });

  it('rejects a file with missing required fields', () => {
    const result = fromYaml(`schemaVersion: 1
id: inv_bad
number: INV-2026-9999
status: draft
`);
    expect(result.ok).toBe(false);
  });

  it('accepts a valid invoice', () => {
    const invoice = createEmptyInvoice(undefined, new Date('2026-10-01'));
    invoice.number = 'INV-2026-0001';
    invoice.client.name = 'Test Client';
    const yaml = JSON.stringify({
      schemaVersion: 1,
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      currency: invoice.currency,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      seller: invoice.seller,
      client: invoice.client,
      items: invoice.items.map((i) => ({ id: i.id, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate })),
      discount: invoice.discount,
      notes: invoice.notes,
      terms: invoice.terms,
    });
    const result = fromYaml(yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.invoice.number).toBe('INV-2026-0001');
    }
  });
});

describe('backup round-trip', () => {
  it('exports and re-imports an invoice', () => {
    const invoice = createEmptyInvoice(undefined, new Date('2026-10-01'));
    invoice.number = 'INV-2026-0001';
    invoice.client.name = 'RoundTrip Client';

    // Build a YAML that mimics the export format
    const multiDoc = `# Invoice Generator backup
---
type: profile
${JSON.stringify({
  seller: invoice.seller,
  numbering: { prefix: 'INV-{YYYY}-{SEQ:4}', yearStart: 2026, sequenceStart: 1 },
}, null, 2)}
---
type: clients
[]
---
${JSON.stringify({
  schemaVersion: 1,
  id: invoice.id,
  number: invoice.number,
  status: invoice.status,
  currency: invoice.currency,
  issueDate: invoice.issueDate,
  dueDate: invoice.dueDate,
  seller: invoice.seller,
  client: invoice.client,
  items: invoice.items.map((i) => ({ id: i.id, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate })),
  discount: invoice.discount,
  notes: invoice.notes,
  terms: invoice.terms,
}, null, 2)}`;

    // Parse the invoice document (last doc after last ---)
    const parts = multiDoc.split('---').filter((s) => s.trim());
    const lastPart = parts[parts.length - 1].trim();
    const result = fromYaml(lastPart);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.invoice.id).toBe(invoice.id);
      expect(result.invoice.number).toBe('INV-2026-0001');
    }
  });
});
