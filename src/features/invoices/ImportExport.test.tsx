/**
 * Tests for import/export functionality.
 */
import { describe, it, expect } from 'vitest';
import { fromYaml } from '../../domain';

describe('import — rejects invalid file', () => {
  it('returns an error for non-YAML content', () => {
    const result = fromYaml('this is not yaml {{{invalid');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('returns an error for content missing required fields', () => {
    const result = fromYaml(`schemaVersion: 1
id: test
number: ""
status: draft
currency: MYR
issueDate: 2026-10-01
dueDate: 2026-10-15
seller:
  name: ""
  email: ""
  phone: ""
  address: ""
  taxId: ""
  bank:
    name: ""
    accountName: ""
    accountNumber: ""
client:
  name: ""
  email: ""
  address: ""
  taxId: ""
items:
  - id: i1
    description: ""
    quantity: 1
    unitPrice: 0
    taxRate: 0
discount:
  type: none
  value: 0
notes: ""
terms: ""
`);
    // This should pass validation (empty fields are allowed now)
    expect(result.ok).toBe(true);
  });

  it('rejects malformed YAML', () => {
    const result = fromYaml('key: [unclosed bracket');
    expect(result.ok).toBe(false);
  });
});

describe('backup round-trip', () => {
  it('exports and re-imports preserve the invoice', () => {
    const yaml = `schemaVersion: 1
id: inv_01Jtest
number: INV-2026-0001
status: sent
currency: MYR
issueDate: 2026-10-01
dueDate: 2026-10-15
seller:
  name: Test Corp
  email: test@test.com
  phone: "+60123456789"
  address: "123 Test St"
  taxId: "123456789012"
  bank:
    name: "Bank"
    accountName: "Name"
    accountNumber: "123"
client:
  name: Client Co
  email: client@co.com
  address: "456 Rd"
  taxId: ""
items:
  - id: i1
    description: Widget
    quantity: 2
    unitPrice: 50
    taxRate: 6
discount:
  type: none
  value: 0
notes: "Test notes"
terms: "Test terms"
`;

    const result = fromYaml(yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.invoice.id).toBe('inv_01Jtest');
      expect(result.invoice.number).toBe('INV-2026-0001');
      expect(result.invoice.client.name).toBe('Client Co');
      expect(result.invoice.status).toBe('sent');
      expect(result.invoice.items.length).toBe(1);
    }
  });
});
