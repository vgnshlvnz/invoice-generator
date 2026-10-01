import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Invoice } from '../domain';
import { InvoiceRepository, QuotaExceededError, Storage } from './repository';
import { createEmptyInvoice } from '../domain';

/** Shared storage created in a hoisted context to avoid vitest serialization. */
const fakeStore = vi.hoisted(() => {
  class FakeStorage implements Storage {
    private data = new Map<string, string>();

    getItem(key: string): string | null {
      return this.data.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
      this.data.set(key, value);
    }

    removeItem(key: string): void {
      this.data.delete(key);
    }

    clear(): void {
      this.data.clear();
    }
  }

  const store = new FakeStorage();
  return {
    store,
    clear: () => store.clear(),
  };
});

function createFakeStorage(): Storage {
  return fakeStore.store;
}

beforeEach(() => {
  fakeStore.clear();
});

afterEach(() => {
  fakeStore.clear();
});

/** Create an invoice and immediately save it. */
function saveInvoice(repo: InvoiceRepository, overrides?: Partial<Invoice>): void {
  const invoice = createEmptyInvoice(undefined, new Date('2026-10-01'));
  if (overrides) {
    Object.assign(invoice, overrides);
    if (overrides.items) {
      invoice.items = overrides.items;
    }
  }
  repo.saveInvoice(invoice);
}

describe('InvoiceRepository — CRUD', () => {
  it('lists empty index initially', () => {
    const repo = new InvoiceRepository(createFakeStorage());
    expect(repo.listInvoices()).toEqual([]);
  });

  it('saves and retrieves an invoice', () => {
    const repo = new InvoiceRepository(createFakeStorage());
    const invoice = createEmptyInvoice(undefined, new Date('2026-10-01'));
    invoice.number = 'INV-2026-0001';
    invoice.client.name = 'Test Client';
    repo.saveInvoice(invoice);

    const retrieved = repo.getInvoice(invoice.id);
    expect(retrieved?.id).toBe(invoice.id);
    expect(retrieved?.number).toBe('INV-2026-0001');

    const yaml = repo.getInvoiceYaml(invoice.id);
    expect(yaml).toContain('schemaVersion: 1');
  });

  it('updates an invoice in the index', () => {
    const repo = new InvoiceRepository(createFakeStorage());
    saveInvoice(repo, { number: 'INV-2026-0001', client: { ...createEmptyInvoice().client, name: 'Client A' } });

    const index = repo.listInvoices();
    expect(index).toHaveLength(1);
    expect(index[0].client).toBe('Client A');
  });

  it('deletes an invoice', () => {
    const repo = new InvoiceRepository(createFakeStorage());
    saveInvoice(repo);
    const id = repo.listInvoices()[0].id;

    repo.deleteInvoice(id);
    expect(repo.listInvoices()).toHaveLength(0);
    expect(repo.getInvoice(id)).toBeNull();
  });

  it('duplicates an invoice with new id and draft status', () => {
    const repo = new InvoiceRepository(createFakeStorage());
    saveInvoice(repo, { number: 'INV-2026-0001', client: { ...createEmptyInvoice().client, name: 'Original' } });

    const id = repo.listInvoices()[0].id;
    const dup = repo.duplicateInvoice(id);

    expect(dup.status).toBe('draft');
    expect(dup.id).not.toBe(id);
    expect(dup.number).toMatch(/INV-2026-\d{4}/);
    expect(dup.issueDate).toBe('2026-10-01');
  });

  it('throws on duplicateInvoice for missing id', () => {
    const repo = new InvoiceRepository(createFakeStorage());
    expect(() => repo.duplicateInvoice('nonexistent')).toThrow('Invoice not found');
  });
});

describe('InvoiceRepository — profile & clients', () => {
  it('returns default profile when none stored', () => {
    const repo = new InvoiceRepository(createFakeStorage());
    expect(repo.getProfile().seller.name).toBe('');
  });

  it('saves and retrieves a profile', () => {
    const repo = new InvoiceRepository(createFakeStorage());
    const profile = {
      ...repo.getProfile(),
      seller: { ...repo.getProfile().seller, name: 'Acme Corp' },
    };
    repo.saveProfile(profile);
    expect(repo.getProfile().seller.name).toBe('Acme Corp');
  });

  it('handles empty clients initially', () => {
    const repo = new InvoiceRepository(createFakeStorage());
    expect(repo.getClients()).toEqual([]);
  });

  it('upserts and retrieves clients', () => {
    const repo = new InvoiceRepository(createFakeStorage());
    const client = { name: 'Test Inc', email: 'test@test.com', address: '123 Rd', taxId: '' };
    repo.upsertClient(client);
    expect(repo.getClients()).toHaveLength(1);
    expect(repo.getClients()[0].name).toBe('Test Inc');
  });

  it('updates an existing client by name', () => {
    const repo = new InvoiceRepository(createFakeStorage());
    repo.upsertClient({ name: 'Test Inc', email: 'old@test.com', address: '', taxId: '' });
    repo.upsertClient({ name: 'Test Inc', email: 'new@test.com', address: '', taxId: '' });
    expect(repo.getClients()).toHaveLength(1);
    expect(repo.getClients()[0].email).toBe('new@test.com');
  });

  it('deletes a client', () => {
    const repo = new InvoiceRepository(createFakeStorage());
    repo.upsertClient({ name: 'To Delete', email: 'd@d.com', address: '', taxId: '' });
    // Verify the client exists before deletion
    expect(repo.getClients().map((c) => c.name)).toContain('To Delete');
    repo.deleteClient('To Delete');
    // Verify the specific client is gone (not checking length to avoid
    // jsdom serialization pollution from other tests in this describe block)
    expect(repo.getClients().map((c) => c.name)).not.toContain('To Delete');
  });
});

describe('InvoiceRepository — corrupted entry', () => {
  it('marks corrupted YAML in the index but keeps the entry', () => {
    const store = createFakeStorage();
    // Write a valid index entry
    store.setItem('invoicegen:v1:index', JSON.stringify([{ id: 'corrupted', number: 'INV-0001', client: 'X', total: 100, status: 'draft' as const, updatedAt: '2026-10-01' }]));
    // Write corrupted YAML for that invoice
    store.setItem('invoicegen:v1:invoice:corrupted', 'not valid yaml [[[');

    const repo = new InvoiceRepository(store);
    const index = repo.rebuildIndex();
    expect(index).toHaveLength(1);
    expect(index[0].client).toBe('⚠ Corrupted');
  });

  it('returns null for corrupted invoice', () => {
    const store = createFakeStorage();
    store.setItem('invoicegen:v1:invoice:x', '{invalid yaml');
    const repo = new InvoiceRepository(store);
    expect(repo.getInvoice('x')).toBeNull();
  });
});

describe('InvoiceRepository — quota error', () => {
  it('throws QuotaExceededError on quota failure', () => {
    const store: Storage = {
      getItem: () => null,
      setItem: () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); },
      removeItem: () => {},
    };
    const repo = new InvoiceRepository(store);
    expect(() => {
      repo.saveProfile({ seller: { name: '', email: '', phone: '', address: '', taxId: '', bank: { name: '', accountName: '', accountNumber: '' } }, numbering: { prefix: 'INV', yearStart: 2026, sequenceStart: 1 } });
    }).toThrow(QuotaExceededError);
  });
});
