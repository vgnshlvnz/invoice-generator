import { describe, it, expect } from 'vitest';
import { computeTotals } from './totals';
import type { Invoice } from './schema';

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
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
      phone: '',
      address: '',
      taxId: '',
      bank: { name: '', accountName: '', accountNumber: '' },
    },
    client: { name: 'Client', email: 'c@c.com', address: '', taxId: '' },
    items: [
      { id: 'i1', description: 'Widget', quantity: 2, unitPrice: 50, taxRate: 6 },
      { id: 'i2', description: 'Gadget', quantity: 1, unitPrice: 30, taxRate: 0 },
    ],
    discount: { type: 'none', value: 0 },
    notes: '',
    terms: '',
    ...overrides,
  };
}

describe('computeTotals — basic', () => {
  it('no discount, no tax', () => {
    const inv = makeInvoice({
      items: [{ id: 'i1', description: 'X', quantity: 3, unitPrice: 10, taxRate: 0 }],
    });
    const t = computeTotals(inv);
    expect(t.subtotal).toBe(3000);  // 3 × 10.00 = 30.00 → 3000 minor
    expect(t.discount).toBe(0);
    expect(t.taxTotal).toBe(0);
    expect(t.total).toBe(3000);
    expect(t.lines).toHaveLength(1);
    expect(t.lines[0]).toEqual({ net: 3000, discount: 0, taxable: 3000, tax: 0, gross: 3000 });
  });

  it('tax without discount', () => {
    const t = computeTotals(makeInvoice());
    // Line 1: net=2×50=100.00 (10000), tax=6%×100=6.00 (600)
    // Line 2: net=1×30=30.00 (3000), tax=0
    expect(t.subtotal).toBe(13000);
    expect(t.discount).toBe(0);
    expect(t.taxTotal).toBe(600);
    expect(t.total).toBe(13600);
  });
});

describe('computeTotals — percent discount', () => {
  it('prorates discount across lines for tax', () => {
    const inv = makeInvoice({
      discount: { type: 'percent', value: 10 },
    });
    const t = computeTotals(inv);
    // subtotal = 13000, discount = 10% = 1300
    expect(t.subtotal).toBe(13000);
    expect(t.discount).toBe(1300);

    // Line 1 share: 10000/13000 = 0.769230... × 1300 = 1000
    // Line 2 share: 3000/13000 = 0.230769... × 1300 = 300
    expect(t.lines[0].discount).toBe(1000);
    expect(t.lines[1].discount).toBe(300);

    // Line 1 taxable: 10000 - 1000 = 9000, tax 6% of 9000 = 540
    // Line 2 taxable: 3000 - 300 = 2700, tax 0% = 0
    expect(t.lines[0].taxable).toBe(9000);
    expect(t.lines[0].tax).toBe(540);
    expect(t.lines[1].taxable).toBe(2700);
    expect(t.lines[1].tax).toBe(0);

    // total = (9000 + 540) + 2700 = 12240
    expect(t.total).toBe(12240);
  });
});

describe('computeTotals — amount discount', () => {
  it('subtracts flat amount', () => {
    const inv = makeInvoice({
      discount: { type: 'amount', value: 10 }, // RM 10.00 → 1000 minor
    });
    const t = computeTotals(inv);
    expect(t.subtotal).toBe(13000);
    expect(t.discount).toBe(1000); // RM 10 → 1000 minor

    // Prorate: line1 = 10000/13000 × 1000 ≈ 769, line2 = 3000/13000 × 1000 ≈ 231
    expect(t.lines[0].discount + t.lines[1].discount).toBe(1000);

    // Total = sum of line gross values (taxable + tax per line)
    expect(t.total).toBe(t.lines[0].gross + t.lines[1].gross);
  });
});

describe('computeTotals — mixed tax rates', () => {
  it('prorates discount but taxes each line independently', () => {
    const inv = makeInvoice({
      discount: { type: 'percent', value: 20 },
      items: [
        { id: 'i1', description: 'Taxable', quantity: 1, unitPrice: 50, taxRate: 6 },
        { id: 'i2', description: 'Exempt', quantity: 1, unitPrice: 50, taxRate: 0 },
      ],
    });
    const t = computeTotals(inv);
    // subtotal = 10000, discount = 2000
    // line1: share=50%, disc=1000, taxable=4000, tax=6%×4000=240
    // line2: share=50%, disc=1000, taxable=4000, tax=0
    expect(t.discount).toBe(2000);
    expect(t.lines[0].discount).toBe(1000);
    expect(t.lines[1].discount).toBe(1000);
    expect(t.lines[0].tax).toBe(240);
    expect(t.lines[1].tax).toBe(0);
    expect(t.taxTotal).toBe(240);
  });
});

describe('computeTotals — rounding edge cases', () => {
  it('handles fractional minor-unit tax with half-up', () => {
    const inv = makeInvoice({
      items: [{ id: 'i1', description: 'X', quantity: 1, unitPrice: 10.01, taxRate: 6 }],
    });
    // net = 10.01 → 1001 minor, tax = 6% of 1001 = 60.06 → 60 minor (round half-up)
    const t = computeTotals(inv);
    expect(t.lines[0].net).toBe(1001);
    expect(t.lines[0].tax).toBe(60);
  });

  it('handles 0-decimal currency (JPY)', () => {
    const inv = makeInvoice({
      currency: 'JPY',
      items: [{ id: 'i1', description: 'X', quantity: 3, unitPrice: 100, taxRate: 10 }],
    });
    // net = 300, tax = 10% of 300 = 30
    const t = computeTotals(inv);
    expect(t.subtotal).toBe(300);
    expect(t.taxTotal).toBe(30);
    expect(t.total).toBe(330);
  });

  it('handles JPY with percent discount', () => {
    const inv = makeInvoice({
      currency: 'JPY',
      discount: { type: 'percent', value: 15 },
      items: [
        { id: 'i1', description: 'A', quantity: 1, unitPrice: 1000, taxRate: 10 },
        { id: 'i2', description: 'B', quantity: 1, unitPrice: 2000, taxRate: 10 },
      ],
    });
    // subtotal = 3000, discount = 15% of 3000 = 450
    // line1: share=1/3, disc=150, taxable=850, tax=85
    // line2: share=2/3, disc=300, taxable=1700, tax=170
    const t = computeTotals(inv);
    expect(t.discount).toBe(450);
    expect(t.lines[0].discount).toBe(150);
    expect(t.lines[1].discount).toBe(300);
    expect(t.lines[0].tax).toBe(85);
    expect(t.lines[1].tax).toBe(170);
  });
});
