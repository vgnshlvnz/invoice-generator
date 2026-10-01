import { describe, it, expect } from 'vitest';
import { reducer, type AppState } from './store';
import type { InvoiceIndexEntry, Profile, SavedClient } from '../domain';
import { createEmptyInvoice } from '../domain';

/** Create a minimal app state for testing. */
function makeState(overrides: Partial<AppState> = {}): AppState {
  const invoice = createEmptyInvoice(undefined, new Date('2026-10-01'));
  return {
    invoice: {
      invoice,
      yamlText: '',
      yamlErrors: [],
      dirty: false,
      saveStatus: 'idle',
    },
    index: [],
    profile: {
      seller: { name: '', email: '', phone: '', address: '', taxId: '', bank: { name: '', accountName: '', accountNumber: '' } },
      numbering: { prefix: 'INV', yearStart: 2026, sequenceStart: 1 },
    },
    clients: [],
    onboarding: { show: false, done: true },
    ...overrides,
  };
}

describe('reducer — LOAD', () => {
  it('replaces the invoice and clears errors', () => {
    const state = makeState();
    const newInvoice = createEmptyInvoice(undefined, new Date('2026-10-02'));
    newInvoice.number = 'INV-2026-0002';
    newInvoice.client.name = 'Loaded Client';
    const newState = reducer(state, { type: 'LOAD', payload: newInvoice });
    expect(newState.invoice.invoice.id).toBe(newInvoice.id);
    expect(newState.invoice.dirty).toBe(false);
    expect(newState.invoice.yamlErrors).toEqual([]);
  });
});

describe('reducer — NEW', () => {
  it('creates a new draft with generated number', () => {
    const index: InvoiceIndexEntry[] = [
      { id: 'x', number: 'INV-2026-0001', client: 'A', total: 100, status: 'draft', updatedAt: '2026-10-01' },
    ];
    const state = makeState({ index });
    const newState = reducer(state, { type: 'NEW' });
    expect(newState.invoice.dirty).toBe(true);
    expect(newState.invoice.saveStatus).toBe('idle');
    expect(newState.invoice.invoice.status).toBe('draft');
    expect(newState.invoice.invoice.number).toBe('INV-2026-0002');
  });
});

describe('reducer — UPDATE_FIELD', () => {
  it('updates a nested field via dot path', () => {
    const state = makeState();
    const newState = reducer(state, { type: 'UPDATE_FIELD', path: 'client.name', value: 'New Name' });
    expect(newState.invoice.invoice.client.name).toBe('New Name');
    expect(newState.invoice.dirty).toBe(true);
    expect(newState.invoice.saveStatus).toBe('idle');
  });
});

describe('reducer — ADD_ITEM / REMOVE_ITEM / MOVE_ITEM', () => {
  it('adds a new item', () => {
    const state = makeState();
    const newState = reducer(state, { type: 'ADD_ITEM' });
    expect(newState.invoice.invoice.items.length).toBe(2);
  });

  it('removes an item at the given index', () => {
    const state = makeState();
    const newState = reducer(state, { type: 'ADD_ITEM' });
    const newState2 = reducer(newState, { type: 'REMOVE_ITEM', index: 0 });
    expect(newState2.invoice.invoice.items.length).toBe(1);
  });

  it('moves an item from one index to another', () => {
    const state = makeState();
    const afterAdd = reducer(state, { type: 'ADD_ITEM' });
    const newState = reducer(afterAdd, { type: 'MOVE_ITEM', from: 1, to: 0 });
    expect(newState.invoice.invoice.items[0].id).toBe(afterAdd.invoice.invoice.items[1].id);
    expect(newState.invoice.invoice.items[1].id).toBe(state.invoice.invoice.items[0].id);
  });
});

describe('reducer — SET_YAML_TEXT', () => {
  it('replaces invoice when text is valid', () => {
    const state = makeState();
    const validYaml = `schemaVersion: 1
id: inv_01Jtest
number: INV-2026-0001
status: sent
currency: MYR
issueDate: 2026-10-01
dueDate: 2026-10-15
seller:
  name: Test
  email: test@test.com
  phone: ""
  address: ""
  taxId: ""
  bank:
    name: ""
    accountName: ""
    accountNumber: ""
client:
  name: Client
  email: c@c.com
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
    const newState = reducer(state, { type: 'SET_YAML_TEXT', text: validYaml });
    expect(newState.invoice.invoice.id).toBe('inv_01Jtest');
    expect(newState.invoice.invoice.status).toBe('sent');
    expect(newState.invoice.yamlErrors).toEqual([]);
  });

  it('keeps last-good invoice and stores errors when text is invalid', () => {
    const state = makeState();
    const invalidYaml = 'schemaVersion: 1\nid: x\nstatus: bad_value\nnot_an_object';
    const newState = reducer(state, { type: 'SET_YAML_TEXT', text: invalidYaml });
    expect(newState.invoice.yamlErrors.length).toBeGreaterThan(0);
    // Invoice should remain unchanged
    expect(newState.invoice.invoice.id).toBe(state.invoice.invoice.id);
  });
});

describe('reducer — SAVE_OK / SAVE_ERR', () => {
  it('clears dirty and sets saved status on SAVE_OK', () => {
    const state = makeState();
    const newState = reducer(state, { type: 'SAVE_OK' });
    expect(newState.invoice.dirty).toBe(false);
    expect(newState.invoice.saveStatus).toBe('saved');
  });

  it('sets error status on SAVE_ERR', () => {
    const state = makeState();
    const newState = reducer(state, { type: 'SAVE_ERR', error: 'disk full' });
    expect(newState.invoice.saveStatus).toBe('error');
  });
});

describe('reducer — SET_INDEX / SET_PROFILE / SET_CLIENTS', () => {
  it('sets the index', () => {
    const state = makeState();
    const index: InvoiceIndexEntry[] = [{ id: 'x', number: 'INV-0001', client: 'A', total: 0, status: 'draft', updatedAt: '2026-10-01' }];
    const newState = reducer(state, { type: 'SET_INDEX', index });
    expect(newState.index).toBe(index);
  });

  it('sets the profile', () => {
    const state = makeState();
    const profile: Profile = {
      ...state.profile,
      seller: { ...state.profile.seller, name: 'New Corp' },
    };
    const newState = reducer(state, { type: 'SET_PROFILE', profile });
    expect(newState.profile.seller.name).toBe('New Corp');
  });

  it('sets the clients', () => {
    const state = makeState();
    const clients: SavedClient[] = [{ name: 'A', email: 'a@b.com', address: '', taxId: '' }];
    const newState = reducer(state, { type: 'SET_CLIENTS', clients });
    expect(newState.clients).toBe(clients);
  });
});

describe('reducer — DELETE', () => {
  it('resets to initial state and removes from index', () => {
    const index: InvoiceIndexEntry[] = [{ id: 'x', number: 'INV-0001', client: 'A', total: 0, status: 'draft', updatedAt: '2026-10-01' }];
    const state = makeState({ index, invoice: { ...makeState().invoice, invoice: { ...createEmptyInvoice(), id: 'x', number: 'INV-0001', items: [{ id: 'x', description: '', quantity: 1, unitPrice: 0, taxRate: 0 }] } } });
    const newState = reducer(state, { type: 'DELETE' });
    expect(newState.index).toEqual([]);
    expect(newState.invoice.dirty).toBe(false);
  });
});

describe('reducer — DUPLICATE', () => {
  it('loads the duplicated invoice', () => {
    const state = makeState();
    const dup = createEmptyInvoice(undefined, new Date('2026-10-02'));
    const newState = reducer(state, { type: 'DUPLICATE', invoice: dup });
    expect(newState.invoice.invoice.id).toBe(dup.id);
    expect(newState.invoice.dirty).toBe(true);
  });
});
