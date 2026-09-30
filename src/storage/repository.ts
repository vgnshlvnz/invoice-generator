/**
 * Storage repository — all localStorage access lives here.
 *
 * Uses an injectable Storage interface so tests can swap in a Map-backed fake.
 */
import type { Invoice, InvoiceIndexEntry, Profile, SavedClient } from '../domain';
import { computeTotals } from '../domain';
import { toYaml, fromYaml } from '../domain';

/** Minimal localStorage-like interface. */
export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Native browser localStorage (the default). */
const localStorage: Storage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
};

/** Error thrown when storage quota is exceeded. */
export class QuotaExceededError extends Error {
  constructor() {
    super('Storage quota exceeded');
    this.name = 'QuotaExceededError';
  }
}

/** Error thrown when a stored entry is corrupted. */
export class CorruptedEntryError extends Error {
  constructor(public readonly key: string, message: string) {
    super(message);
    this.name = 'CorruptedEntryError';
  }
}

/** Prefix used for all localStorage keys. */
const PREFIX = 'invoicegen:v1:';
const INDEX_KEY = `${PREFIX}index`;
const INVOICE_KEY = (id: string) => `${PREFIX}invoice:${id}`;
const PROFILE_KEY = `${PREFIX}profile`;
const CLIENTS_KEY = `${PREFIX}clients`;

/** Default profile with empty seller and standard numbering. */
const DEFAULT_PROFILE: Profile = {
  seller: {
    name: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    bank: { name: '', accountName: '', accountNumber: '' },
  },
  numbering: { prefix: 'INV', yearStart: new Date().getFullYear(), sequenceStart: 1 },
};

/** Default empty clients list. */
const DEFAULT_CLIENTS: SavedClient[] = [];

/** Safely read and parse a JSON string from storage. */
function readJSON<T>(store: Storage, key: string, fallback: T): T {
  try {
    const raw = store.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Safely write and stringify a value to storage. */
function writeJSON(store: Storage, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      throw new QuotaExceededError();
    }
    throw e;
  }
}

/** Safely write and stringify a non-JSON value (YAML). */
function writeRaw(store: Storage, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      throw new QuotaExceededError();
    }
    throw e;
  }
}

/** Safely read a raw string from storage. */
function readRaw(store: Storage, key: string, fallback: string): string {
  try {
    const raw = store.getItem(key);
    return raw ?? fallback;
  } catch {
    return fallback;
  }
}

/** Compute an index entry for an invoice. */
function computeIndexEntry(invoice: Invoice): InvoiceIndexEntry {
  const totals = computeTotals(invoice);
  return {
    id: invoice.id,
    number: invoice.number,
    client: invoice.client.name,
    total: totals.total,
    status: invoice.status,
    updatedAt: invoice.issueDate, // fallback to issueDate; could be refined
  };
}

/**
 * Repository — the single source of truth for persisted data.
 *
 * @param store — injectable storage interface (defaults to window.localStorage)
 */
export class InvoiceRepository {
  private store: Storage;

  constructor(store?: Storage) {
    this.store = store ?? localStorage;
  }

  // ── Index ──────────────────────────────────────────────────────────

  /** List all invoices in the index. */
  listInvoices(): InvoiceIndexEntry[] {
    return readJSON<InvoiceIndexEntry[]>(this.store, INDEX_KEY, []);
  }

  /** Rebuild the index from raw invoice YAML data. */
  rebuildIndex(): InvoiceIndexEntry[] {
    const entries = this.listInvoices();
    const fresh: InvoiceIndexEntry[] = [];

    for (const entry of entries) {
      const raw = readRaw(this.store, INVOICE_KEY(entry.id), '');
      const result = fromYaml(raw);
      if (result.ok) {
        fresh.push(computeIndexEntry(result.invoice));
      } else {
        // Mark as corrupted but keep the entry
        fresh.push({
          ...entry,
          client: `⚠ Corrupted`,
          total: -1,
          status: 'void' as const,
        });
      }
    }

    writeJSON(this.store, INDEX_KEY, fresh);
    return fresh;
  }

  // ── Invoice CRUD ───────────────────────────────────────────────────

  /** Get an invoice's YAML string by ID. */
  getInvoiceYaml(id: string): string {
    return readRaw(this.store, INVOICE_KEY(id), '');
  }

  /** Get an invoice parsed from YAML. Returns null if not found or corrupted. */
  getInvoice(id: string): Invoice | null {
    const raw = this.getInvoiceYaml(id);
    if (!raw) return null;
    const result = fromYaml(raw);
    return result.ok ? result.invoice : null;
  }

  /** Save an invoice: writes YAML and updates the index. */
  saveInvoice(invoice: Invoice): void {
    const yaml = toYaml(invoice);
    writeRaw(this.store, INVOICE_KEY(invoice.id), yaml);

    // Update index entry
    const index = this.listInvoices();
    const idx = index.findIndex((e) => e.id === invoice.id);
    const entry = computeIndexEntry(invoice);

    if (idx >= 0) {
      index[idx] = entry;
    } else {
      index.push(entry);
    }

    try {
      writeJSON(this.store, INDEX_KEY, index);
    } catch {
      // If index write fails but invoice YAML succeeded, the data is safe
      // — the invoice file exists, just the index is stale
    }
  }

  /** Delete an invoice by ID. */
  deleteInvoice(id: string): void {
    try {
      this.store.removeItem(INVOICE_KEY(id));
    } catch {
      // ignore
    }

    const index = this.listInvoices().filter((e) => e.id !== id);
    writeJSON(this.store, INDEX_KEY, index);
  }

  /** Duplicate an invoice: new id, next number, draft status, today's dates. */
  duplicateInvoice(id: string): Invoice {
    const original = this.getInvoice(id);
    if (!original) {
      throw new Error(`Invoice not found: ${id}`);
    }

    const now = new Date();
    const isoToday = now.toISOString().slice(0, 10);

    // Find next available sequence number
    const index = this.listInvoices();
    const existingNumbers = new Set(index.map((e) => e.number));
    let seq = 1;
    while (existingNumbers.has(`INV-${now.getFullYear()}-${String(seq).padStart(4, '0')}`)) {
      seq++;
    }

    const nextNumber = `INV-${now.getFullYear()}-${String(seq).padStart(4, '0')}`;

    const clone: Invoice = {
      ...original,
      id: `${original.id}_dup${seq}`, // TODO: use domain generateId()
      number: nextNumber,
      status: 'draft',
      issueDate: isoToday,
      dueDate: isoToday,
      items: original.items.map((item) => ({ ...item, id: `${item.id}_dup${seq}` })),
    };

    this.saveInvoice(clone);
    return clone;
  }

  // ── Profile ────────────────────────────────────────────────────────

  /** Get the seller profile. */
  getProfile(): Profile {
    const raw = this.store.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    try {
      return JSON.parse(raw) as Profile;
    } catch {
      return DEFAULT_PROFILE;
    }
  }

  /** Save the seller profile. */
  saveProfile(profile: Profile): void {
    writeJSON(this.store, PROFILE_KEY, profile);
  }

  // ── Clients ────────────────────────────────────────────────────────

  /** Get all saved clients. */
  getClients(): SavedClient[] {
    return readJSON<SavedClient[]>(this.store, CLIENTS_KEY, DEFAULT_CLIENTS);
  }

  /** Upsert a client by name (unique by name). */
  upsertClient(client: SavedClient): void {
    const clients = this.getClients();
    const idx = clients.findIndex((c) => c.name === client.name);
    if (idx >= 0) {
      clients[idx] = client;
    } else {
      clients.push(client);
    }
    writeJSON(this.store, CLIENTS_KEY, clients);
  }

  /** Delete a client by name. */
  deleteClient(name: string): void {
    const clients = this.getClients().filter((c) => c.name !== name);
    writeJSON(this.store, CLIENTS_KEY, clients);
  }
}

/** Factory to create a repository with the default browser storage. */
export function createRepository(): InvoiceRepository {
  return new InvoiceRepository();
}
