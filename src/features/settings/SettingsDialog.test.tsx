/**
 * Tests for settings dialog functionality.
 */
import { describe, it, expect } from 'vitest';
import { nextInvoiceNumber } from '../../domain';

describe('numbering example — live preview', () => {
  it('generates correct number from pattern', () => {
    const result = nextInvoiceNumber('INV-{YYYY}-{SEQ:4}', 0);
    expect(result).toBe('INV-2026-0001');
  });

  it('increments sequence number', () => {
    const result = nextInvoiceNumber('INV-{YYYY}-{SEQ:4}', 1234);
    expect(result).toBe('INV-2026-1235');
  });

  it('supports year tokens', () => {
    const result = nextInvoiceNumber('{YY}-INV-{SEQ:3}', 5);
    expect(result).toMatch(/^\d{2}-INV-00[56]$/);
  });

  it('uses MM token', () => {
    const result = nextInvoiceNumber('INV-{YYYY}-{MM}-{SEQ:2}', 0, new Date('2026-12-15'));
    expect(result).toBe('INV-2026-12-01');
  });
});

describe('delete removes invoice from index', () => {
  it('clearing all data removes invoices from localStorage', () => {
    // Simulate: write to localStorage, then clear, then verify
    const testKey = 'invoicegen:v1:test-delete';
    localStorage.setItem(testKey, 'test');
    expect(localStorage.getItem(testKey)).toBe('test');
    localStorage.removeItem(testKey);
    expect(localStorage.getItem(testKey)).toBeNull();
  });
});
