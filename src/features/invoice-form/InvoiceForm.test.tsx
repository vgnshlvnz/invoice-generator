/**
 * Tests for InvoiceForm component.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppProvider, type AppState } from '../../state/store';
import { InvoiceForm } from './InvoiceForm';
import type { InvoiceRepository } from '../../storage/repository';
import { createEmptyInvoice } from '../../domain';

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

/** Mock repository with minimal implementation. */
function makeRepo(): InvoiceRepository {
  return {
    listInvoices: () => [],
    getInvoiceYaml: () => '',
    getInvoice: () => null,
    saveInvoice: () => {},
    deleteInvoice: () => {},
    getProfile: () => makeState().profile,
    saveProfile: () => {},
    getClients: () => [],
    duplicateInvoice: () => makeState().invoice.invoice,
  } as unknown as InvoiceRepository;
}

function renderWithState(state: AppState) {
  // Inject state into localStorage for AppProvider's initial state
  localStorage.setItem('invoicegen:v1:profile', JSON.stringify(state.profile));
  const repo = makeRepo();
  return render(
    <AppProvider repository={repo}>
      <InvoiceForm />
    </AppProvider>,
  );
}

describe('InvoiceForm', () => {
  it('renders the invoice header section', () => {
    renderWithState(makeState());
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/issue date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
  });

  it('renders the seller section fields', () => {
    renderWithState(makeState());
    expect(screen.getByLabelText('Name', { selector: '#seller-name' })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i, { selector: '#seller-email' })).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i, { selector: '#seller-phone' })).toBeInTheDocument();
  });

  it('renders the client section', () => {
    renderWithState(makeState());
    expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
  });

  it('renders the line items table', () => {
    renderWithState(makeState());
    expect(screen.getByRole('table', { name: /line items/i })).toBeInTheDocument();
  });

  it('adds a new item when clicking Add item', async () => {
    const { container } = renderWithState(makeState());
    const beforeCount = container.querySelectorAll('tbody tr').length;
    const addButton = screen.getByRole('button', { name: /add item/i });
    fireEvent.click(addButton);
    const afterCount = container.querySelectorAll('tbody tr').length;
    expect(afterCount).toBe(beforeCount + 1);
  });

  it('removes an item when clicking remove button', async () => {
    const { container } = renderWithState(makeState());
    const removeButtons = screen.getAllByRole('button', { name: /remove item/i });
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);
      const afterRemove = container.querySelectorAll('tbody tr').length;
      expect(afterRemove).toBe(0);
    }
  });

  it('displays computed totals', () => {
    const state = makeState();
    // Set a known item with a price
    state.invoice.invoice.items[0].quantity = 2;
    state.invoice.invoice.items[0].unitPrice = 100;
    state.invoice.invoice.items[0].taxRate = 10;
    renderWithState(state);
    // Totals section should be present
    expect(screen.getByLabelText(/invoice totals/i)).toBeInTheDocument();
  });

  it('handles discount type selection', () => {
    renderWithState(makeState());
    const discountSelect = screen.getByLabelText(/type/i) as HTMLSelectElement;
    expect(discountSelect).toBeInTheDocument();
    expect(discountSelect.value).toBe('none');
  });
});
