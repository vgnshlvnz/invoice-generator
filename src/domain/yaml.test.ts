import { describe, it, expect } from 'vitest';
import { toYaml, fromYaml, migrate } from './yaml';
import type { Invoice } from './schema';

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    schemaVersion: 1,
    id: 'inv_01Jtest',
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
      bank: { name: 'Maybank', accountName: 'Test Co', accountNumber: '1234567890' },
    },
    client: { name: 'Client Ltd', email: 'c@c.com', address: '456 Rd', taxId: '' },
    items: [
      { id: 'i1', description: 'Widget', quantity: 2, unitPrice: 50, taxRate: 6 },
      { id: 'i2', description: 'Gadget', quantity: 1, unitPrice: 30, taxRate: 0 },
    ],
    discount: { type: 'percent', value: 10 },
    notes: 'Please deliver by Friday.',
    terms: 'Net 30.',
    ...overrides,
  };
}

describe('toYaml', () => {
  it('produces stable key order', () => {
    const yaml = toYaml(makeInvoice());
    const lines = yaml.split('\n');

    // Verify top-level key order
    const keyPositions: Record<string, number> = {};
    lines.forEach((line, i) => {
      const match = line.match(/^(schemaVersion|id|number|status|currency|issueDate|dueDate|seller|client|items|discount|notes|terms):/);
      if (match) keyPositions[match[1]] = i;
    });

    const keys = Object.keys(keyPositions);
    const expectedOrder = ['schemaVersion', 'id', 'number', 'status', 'currency', 'issueDate', 'dueDate', 'seller', 'client', 'items', 'discount', 'notes', 'terms'];

    for (let i = 1; i < keys.length; i++) {
      const prevIdx = expectedOrder.indexOf(keys[i - 1]);
      const currIdx = expectedOrder.indexOf(keys[i]);
      expect(currIdx).toBeGreaterThan(prevIdx);
    }
  });

  it('includes all fields', () => {
    const yaml = toYaml(makeInvoice());
    expect(yaml).toContain('schemaVersion: 1');
    expect(yaml).toContain('status: draft');
    expect(yaml).toContain('currency: MYR');
    expect(yaml).toContain('discount:');
    expect(yaml).toContain('type: percent');
  });

  it('uses 2-space indentation', () => {
    const yaml = toYaml(makeInvoice());
    // Seller fields should be indented 2 spaces
    expect(yaml).toMatch(/^ {2}name:/m);
    // Nested bank fields should be indented 4 spaces
    expect(yaml).toMatch(/^ {4}name:/m);
  });
});

describe('fromYaml — success', () => {
  it('parses a valid invoice YAML', () => {
    const invoice = makeInvoice();
    const yaml = toYaml(invoice);
    const result = fromYaml(yaml);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.invoice.id).toBe('inv_01Jtest');
      expect(result.invoice.status).toBe('draft');
      expect(result.invoice.items).toHaveLength(2);
    }
  });

  it('round-trip preserves invoice data', () => {
    const invoice = makeInvoice();
    const yaml = toYaml(invoice);
    const result1 = fromYaml(yaml);
    expect(result1.ok).toBe(true);
    if (!result1.ok) return;

    const yaml2 = toYaml(result1.invoice);
    const result2 = fromYaml(yaml2);
    expect(result2.ok).toBe(true);
    if (!result2.ok) return;

    // Structural equality of key fields
    expect(result2.invoice.id).toBe(result1.invoice.id);
    expect(result2.invoice.number).toBe(result1.invoice.number);
    expect(result2.invoice.status).toBe(result1.invoice.status);
    expect(result2.invoice.currency).toBe(result1.invoice.currency);
    expect(result2.invoice.items.length).toBe(result1.invoice.items.length);
    expect(result2.invoice.items[0].description).toBe(result1.invoice.items[0].description);
    expect(result2.invoice.items[0].quantity).toBe(result1.invoice.items[0].quantity);
  });
});

describe('fromYaml — errors', () => {
  it('returns error for invalid YAML syntax', () => {
    const result = fromYaml('this: is: not: valid: [[[[');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('returns error for missing required field', () => {
    const yaml = `schemaVersion: 1\nid: x\nnumber: x\nstatus: draft\ncurrency: MYR\nissueDate: 2026-10-01\ndueDate: 2026-10-15\nseller:\n  name: A\n  email: a@b.com\n  phone: ''\n  address: ''\n  taxId: ''\n  bank:\n    name: ''\n    accountName: ''\n    accountNumber: ''\nclient:\n  name: A\n  email: a@b.com\n  address: ''\n  taxId: ''\nitems: []\ndiscount:\n  type: none\n  value: 0\nnotes: ''\nterms: ''\n`;
    const result = fromYaml(yaml);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('returns error for invalid status', () => {
    const yaml = `schemaVersion: 1
id: inv_01Jtest
number: INV-2026-0001
status: unknown
currency: MYR
issueDate: 2026-10-01
dueDate: 2026-10-15
seller:
  name: A
  email: a@b.com
  phone: ""
  address: ""
  taxId: ""
  bank:
    name: ""
    accountName: ""
    accountNumber: ""
client:
  name: A
  email: a@b.com
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
`;
    const result = fromYaml(yaml);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path.includes('status'))).toBe(true);
    }
  });

  it('returns error for dueDate before issueDate', () => {
    const yaml = `schemaVersion: 1
id: inv_01Jtest
number: INV-2026-0001
status: draft
currency: MYR
issueDate: 2026-10-15
dueDate: 2026-10-01
seller:
  name: A
  email: a@b.com
  phone: ""
  address: ""
  taxId: ""
  bank:
    name: ""
    accountName: ""
    accountNumber: ""
client:
  name: A
  email: a@b.com
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
`;
    const result = fromYaml(yaml);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path.includes('dueDate'))).toBe(true);
    }
  });
});

describe('migrate', () => {
  it('passes v1 through unchanged', () => {
    const doc = { schemaVersion: 1, id: 'x', number: 'y' };
    const result = migrate(doc);
    expect(result).toEqual(doc);
  });

  it('passes unknown version through (let validation handle it)', () => {
    const doc = { schemaVersion: 99, id: 'x' };
    const result = migrate(doc);
    expect(result).toEqual(doc);
  });

  it('handles non-object input', () => {
    expect(migrate('hello')).toBe('hello');
    expect(migrate(42)).toBe(42);
    expect(migrate(null)).toBeNull();
  });
});
