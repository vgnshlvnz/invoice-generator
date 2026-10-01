/**
 * Tests for Preview — rendering and totals consistency.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { AppProvider } from '../../state/store';
import { createRepository } from '../../storage/repository';
import { InvoiceForm } from '../invoice-form';
import { Preview, taxByRate } from './Preview';

describe('taxByRate', () => {
  it('groups line taxes by rate and skips zero rates', () => {
    expect(taxByRate([6, 0, 6, 8], [60, 0, 30, 80])).toEqual([
      { rate: 6, tax: 90 },
      { rate: 8, tax: 80 },
    ]);
  });
});

describe('Preview', () => {
  beforeEach(() => localStorage.clear());

  it('renders the invoice and updates from form edits', () => {
    render(
      <AppProvider repository={createRepository()}>
        <InvoiceForm />
        <Preview />
      </AppProvider>,
    );
    const paper = screen.getByRole('article');
    expect(within(paper).getByRole('heading', { name: 'INVOICE' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name', { selector: '#client-name' }), {
      target: { value: 'Acme Sdn Bhd' },
    });
    expect(within(paper).getByText('Acme Sdn Bhd')).toBeInTheDocument();
    expect(within(paper).getByText('Total due')).toBeInTheDocument();
  });

  it('has a print button', () => {
    render(
      <AppProvider repository={createRepository()}>
        <Preview />
      </AppProvider>,
    );
    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
  });
});
