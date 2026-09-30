import { describe, it, expect } from 'vitest';
import { InvoiceSchema, validate } from './schema';
import type { Invoice } from './schema';

function validInvoice(): Invoice {
  return {
    schemaVersion: 1,
    id: 'inv_test',
    number: 'INV-2026-0001',
    status: 'draft',
    currency: 'MYR',
    issueDate: '2026-10-01',
    dueDate: '2026-10-15',
    seller: {
      name: 'Test Sdn Bhd',
      email: 'test@example.com',
      phone: '+60123456789',
      address: '123 Test St',
      taxId: '123456789012',
      bank: { name: 'Bank', accountName: 'Name', accountNumber: '123' },
    },
    client: { name: 'Client', email: 'c@c.com', address: '456 Rd', taxId: '' },
    items: [{ id: 'i1', description: 'Widget', quantity: 1, unitPrice: 10, taxRate: 6 }],
    discount: { type: 'none', value: 0 },
    notes: '',
    terms: '',
  };
}

describe('InvoiceSchema', () => {
  it('validates a correct invoice', () => {
    const result = InvoiceSchema.safeParse(validInvoice());
    expect(result.success).toBe(true);
  });

  it('rejects quantity ≤ 0', () => {
    const inv = validInvoice();
    (inv.items[0] as unknown as Record<string, number>).quantity = 0;
    expect(InvoiceSchema.safeParse(inv).success).toBe(false);

    (inv.items[0] as unknown as Record<string, number>).quantity = -1;
    expect(InvoiceSchema.safeParse(inv).success).toBe(false);
  });

  it('accepts unitPrice = 0', () => {
    const inv = validInvoice();
    (inv.items[0] as unknown as Record<string, number>).unitPrice = 0;
    expect(InvoiceSchema.safeParse(inv).success).toBe(true);
  });

  it('rejects negative unitPrice', () => {
    const inv = validInvoice();
    (inv.items[0] as unknown as Record<string, number>).unitPrice = -1;
    expect(InvoiceSchema.safeParse(inv).success).toBe(false);
  });

  it('accepts taxRate 0 and 100', () => {
    let inv = validInvoice();
    (inv.items[0] as unknown as Record<string, number>).taxRate = 0;
    expect(InvoiceSchema.safeParse(inv).success).toBe(true);

    inv = validInvoice();
    (inv.items[0] as unknown as Record<string, number>).taxRate = 100;
    expect(InvoiceSchema.safeParse(inv).success).toBe(true);
  });

  it('rejects taxRate > 100 or < 0', () => {
    let inv = validInvoice();
    (inv.items[0] as unknown as Record<string, number>).taxRate = 101;
    expect(InvoiceSchema.safeParse(inv).success).toBe(false);

    inv = validInvoice();
    (inv.items[0] as unknown as Record<string, number>).taxRate = -1;
    expect(InvoiceSchema.safeParse(inv).success).toBe(false);
  });

  it('accepts valid 3-letter currency codes', () => {
    let inv = validInvoice();
    inv.currency = 'USD';
    expect(InvoiceSchema.safeParse(inv).success).toBe(true);

    inv = validInvoice();
    inv.currency = 'JPY';
    expect(InvoiceSchema.safeParse(inv).success).toBe(true);
  });

  it('rejects invalid currency codes', () => {
    let inv = validInvoice();
    inv.currency = 'usd';
    expect(InvoiceSchema.safeParse(inv).success).toBe(false);

    inv = validInvoice();
    inv.currency = 'MY';
    expect(InvoiceSchema.safeParse(inv).success).toBe(false);

    inv = validInvoice();
    inv.currency = 'MYR1';
    expect(InvoiceSchema.safeParse(inv).success).toBe(false);
  });

  it('rejects dueDate before issueDate', () => {
    const inv = validInvoice();
    inv.issueDate = '2026-10-15';
    inv.dueDate = '2026-10-01';
    const result = InvoiceSchema.safeParse(inv);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toContain('dueDate');
    }
  });

  it('accepts dueDate equal to issueDate', () => {
    const inv = validInvoice();
    inv.dueDate = '2026-10-01';
    expect(InvoiceSchema.safeParse(inv).success).toBe(true);
  });

  it('requires at least one item', () => {
    const inv = validInvoice();
    inv.items = [];
    expect(InvoiceSchema.safeParse(inv).success).toBe(false);
  });
});

describe('validate', () => {
  it('returns ok: true for valid input', () => {
    const result = validate(validInvoice());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.invoice.id).toBe('inv_test');
    }
  });

  it('returns ok: false with errors for invalid input', () => {
    const result = validate({ invalid: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('returns ok: false with errors for wrong schema version', () => {
    const result = validate({ schemaVersion: 2 } as unknown as Invoice);
    expect(result.ok).toBe(false);
  });
});
