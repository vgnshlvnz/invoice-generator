/**
 * InvoicesDrawer — main invoice list drawer with search, filter, sort, and row actions.
 */
import { useState } from 'react';
import { useAppState } from '../../state/store';
import type { InvoiceRepository } from '../../storage/repository';
import { Drawer, Button } from '../../ui';
import { useInvoiceList } from './useInvoiceList';
import { InvoiceRow } from './InvoiceRow';
import type { InvoiceFilter } from './types';
import type { InvoiceIndexEntry } from '../../domain';

interface InvoicesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  repository: InvoiceRepository;
  onNewInvoice: () => void;
}

/**
 * A right-side drawer showing the invoice list with search, filter, sort, and row actions.
 * Includes a "New invoice" button.
 */
export function InvoicesDrawer({ isOpen, onClose, repository }: InvoicesDrawerProps) {
  const { state, dispatch } = useAppState();
  const [filter, setFilter] = useState<InvoiceFilter>({
    search: '',
    status: 'all',
    sort: 'date',
    direction: 'desc',
  });
  const [openInvoice, setOpenInvoice] = useState<InvoiceIndexEntry | null>(null);

  const filtered = useInvoiceList(state.index, filter);

  const handleOpen = (entry: InvoiceIndexEntry) => {
    setOpenInvoice(entry);
  };

  const handleDuplicate = (entry: InvoiceIndexEntry) => {
    const invoice = repository.getInvoice(entry.id);
    if (invoice) {
      dispatch({ type: 'DUPLICATE', invoice });
    }
    onClose();
  };

  const handleMarkStatus = (entry: InvoiceIndexEntry, status: 'sent' | 'paid') => {
    const invoice = repository.getInvoice(entry.id);
    if (invoice) {
      dispatch({ type: 'UPDATE_FIELD', path: 'status', value: status });
    }
  };

  const handleDelete = (entry: InvoiceIndexEntry) => {
    repository.deleteInvoice(entry.id);
    dispatch({ type: 'DELETE' });
  };

  const handleNew = () => {
    dispatch({ type: 'NEW' });
    onClose();
  };

  const handleOpenFinal = () => {
    if (openInvoice) {
      dispatch({ type: 'LOAD', payload: repository.getInvoice(openInvoice.id)! });
      onClose();
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Invoices" width="640px">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Filters */}
        <div className="invoice-filters">
          <input
            type="text"
            placeholder="Search by number or client…"
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            aria-label="Search invoices"
          />
          <select
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value as InvoiceFilter['status'] }))}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>
          <select
            value={`${filter.sort}-${filter.direction}`}
            onChange={(e) => {
              const [sort, direction] = e.target.value.split('-') as [InvoiceFilter['sort'], InvoiceFilter['direction']];
              setFilter((f) => ({ ...f, sort, direction }));
            }}
            aria-label="Sort invoices"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="total-desc">Highest total</option>
            <option value="total-asc">Lowest total</option>
          </select>
        </div>

        {/* New invoice button */}
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <Button variant="primary" size="sm" onClick={handleNew}>
            + New invoice
          </Button>
        </div>

        {/* Invoice list table */}
        <table className="invoice-table" aria-label="Invoice list">
          <thead>
            <tr>
              <th className="invoice-table__th">Number</th>
              <th className="invoice-table__th">Client</th>
              <th className="invoice-table__th">Total</th>
              <th className="invoice-table__th">Status</th>
              <th className="invoice-table__th">Updated</th>
              <th className="invoice-table__th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <InvoiceRow
                key={item.entry.id}
                item={item}
                onOpen={handleOpen}
                onDuplicate={handleDuplicate}
                onMarkStatus={handleMarkStatus}
                onDelete={handleDelete}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--color-text-muted)' }}>
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Open confirmation */}
        {openInvoice && (
          <div className="invoice-row__open-confirm">
            <p>Open <strong>{openInvoice.number}</strong>?</p>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <Button variant="primary" size="sm" onClick={handleOpenFinal}>
                Open
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setOpenInvoice(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
