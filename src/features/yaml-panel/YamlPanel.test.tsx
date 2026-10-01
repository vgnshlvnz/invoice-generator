/**
 * Tests for YamlPanel — two-way sync with the form and error handling.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider } from '../../state/store';
import { createRepository } from '../../storage/repository';
import { InvoiceForm } from '../invoice-form';
import { YamlPanel } from './YamlPanel';

function renderWithForm() {
  return render(
    <AppProvider repository={createRepository()}>
      <InvoiceForm />
      <YamlPanel />
    </AppProvider>,
  );
}

const editor = () => screen.getByLabelText('Invoice YAML') as HTMLTextAreaElement;

describe('YamlPanel', () => {
  beforeEach(() => localStorage.clear());

  it('renders the current invoice as YAML', () => {
    renderWithForm();
    expect(editor().value).toMatch(/^schemaVersion: 1/);
    expect(editor().value).toContain('currency:');
  });

  it('reflects form edits live', () => {
    renderWithForm();
    fireEvent.change(screen.getByLabelText('Name', { selector: '#client-name' }), {
      target: { value: 'Acme Sdn Bhd' },
    });
    expect(editor().value).toContain('Acme Sdn Bhd');
  });

  it('pushes valid YAML edits back into the form', async () => {
    renderWithForm();
    const next = editor().value.replace(/notes: .*/, 'notes: Thanks for your business');
    fireEvent.change(editor(), { target: { value: next } });
    await waitFor(() =>
      expect((screen.getByLabelText('Notes', { selector: '#notes' }) as HTMLTextAreaElement).value).toBe('Thanks for your business'),
    );
  });

  it('shows errors for invalid YAML and can revert', async () => {
    renderWithForm();
    const original = editor().value;
    fireEvent.change(editor(), { target: { value: 'schemaVersion: [oops' } });

    await screen.findByText(/YAML is invalid/);
    expect(editor()).toHaveAttribute('aria-invalid', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Revert to last valid' }));
    expect(editor().value).toBe(original);
    expect(screen.queryByText(/YAML is invalid/)).not.toBeInTheDocument();
  });
});
