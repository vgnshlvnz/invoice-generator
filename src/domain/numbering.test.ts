import { describe, it, expect } from 'vitest';
import { nextInvoiceNumber, DEFAULT_PATTERN } from './numbering';

describe('nextInvoiceNumber', () => {
  it('uses default pattern', () => {
    const date = new Date('2026-10-01');
    expect(nextInvoiceNumber(DEFAULT_PATTERN, 0, date)).toBe('INV-2026-0001');
    expect(nextInvoiceNumber(DEFAULT_PATTERN, 1, date)).toBe('INV-2026-0002');
  });

  it('replaces {YYYY}', () => {
    const date = new Date('2026-10-01');
    expect(nextInvoiceNumber('INV-{YYYY}', 1, date)).toBe('INV-2026');
  });

  it('replaces {YY}', () => {
    const date = new Date('2026-10-01');
    expect(nextInvoiceNumber('INV-{YY}', 1, date)).toBe('INV-26');
  });

  it('replaces {MM}', () => {
    const jan = new Date('2026-01-15');
    const dec = new Date('2026-12-15');
    expect(nextInvoiceNumber('{MM}', 0, jan)).toBe('01');
    expect(nextInvoiceNumber('{MM}', 0, dec)).toBe('12');
  });

  it('replaces {SEQ:n} with varying widths', () => {
    const date = new Date('2026-01-01');
    expect(nextInvoiceNumber('INV-{SEQ:2}', 0, date)).toBe('INV-01');
    expect(nextInvoiceNumber('INV-{SEQ:4}', 0, date)).toBe('INV-0001');
    expect(nextInvoiceNumber('INV-{SEQ:6}', 0, date)).toBe('INV-000001');
  });

  it('combines multiple tokens', () => {
    const date = new Date('2026-03-15');
    expect(nextInvoiceNumber('{YYYY}{MM}-{SEQ:4}', 42, date)).toBe('202603-0043');
  });

  it('handles year rollover', () => {
    const dec31 = new Date('2026-12-31');
    const jan1 = new Date('2027-01-01');
    expect(nextInvoiceNumber('INV-{YYYY}-{SEQ:4}', 0, dec31)).toBe('INV-2026-0001');
    expect(nextInvoiceNumber('INV-{YYYY}-{SEQ:4}', 0, jan1)).toBe('INV-2027-0001');
  });

  it('increments sequence independently of date', () => {
    const date = new Date('2026-06-01');
    expect(nextInvoiceNumber('INV-{SEQ:4}', 99, date)).toBe('INV-0100');
    expect(nextInvoiceNumber('INV-{SEQ:4}', 999, date)).toBe('INV-1000');
  });
});
