import { describe, it, expect } from 'vitest';
import { createEmptyInvoice } from './factory';
import type { Seller } from './schema';

describe('createEmptyInvoice', () => {
  it('returns a valid draft invoice', () => {
    const invoice = createEmptyInvoice();
    expect(invoice.status).toBe('draft');
    expect(invoice.schemaVersion).toBe(1);
    expect(invoice.id).toMatch(/^inv_/);
    expect(invoice.items).toHaveLength(1);
    expect(invoice.items[0].description).toBe('');
    expect(invoice.items[0].quantity).toBe(1);
    expect(invoice.items[0].unitPrice).toBe(0);
    expect(invoice.items[0].taxRate).toBe(0);
  });

  it('sets issueDate to today', () => {
    const now = new Date('2026-10-01T12:00:00Z');
    const invoice = createEmptyInvoice(undefined, now);
    expect(invoice.issueDate).toBe('2026-10-01');
  });

  it('sets dueDate to today + 14 days (default)', () => {
    const now = new Date('2026-10-01T12:00:00Z');
    const invoice = createEmptyInvoice(undefined, now);
    expect(invoice.dueDate).toBe('2026-10-15');
  });

  it('prefills seller from profile', () => {
    const profileSeller: Seller = {
      name: 'Acme Corp',
      email: 'billing@acme.com',
      phone: '+60100000000',
      address: '123 Acme St',
      taxId: '999888777',
      bank: { name: 'Bank A', accountName: 'Acme', accountNumber: '111' },
    };
    const profile = { seller: profileSeller, numbering: { prefix: 'INV', yearStart: 2026, sequenceStart: 1 } };
    const invoice = createEmptyInvoice(profile, new Date());

    expect(invoice.seller.name).toBe('Acme Corp');
    expect(invoice.seller.email).toBe('billing@acme.com');
    expect(invoice.seller.bank.name).toBe('Bank A');
  });

  it('defaults seller fields when no profile provided', () => {
    const invoice = createEmptyInvoice();
    expect(invoice.seller.name).toBe('');
    expect(invoice.seller.email).toBe('');
    expect(invoice.seller.bank.name).toBe('');
  });

  it('defaults currency to MYR', () => {
    const invoice = createEmptyInvoice();
    expect(invoice.currency).toBe('MYR');
  });

  it('accepts a custom Date', () => {
    const custom = new Date('2025-01-01');
    const invoice = createEmptyInvoice(undefined, custom);
    expect(invoice.issueDate).toBe('2025-01-01');
    expect(invoice.dueDate).toBe('2025-01-15');
  });
});
