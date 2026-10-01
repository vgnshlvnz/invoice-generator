/**
 * Invoice row — single row in the invoice list with actions.
 */
import { useState } from 'react';
import { Button, Dialog, StatusBadge } from '../../ui';
import type { InvoiceIndexEntry } from '../../domain';
import type { InvoiceListItem } from './types';

interface InvoiceRowProps {
  item: InvoiceListItem;
  onOpen: (entry: InvoiceIndexEntry) => void;
  onDuplicate: (entry: InvoiceIndexEntry) => void;
  onMarkStatus: (entry: InvoiceIndexEntry, status: 'sent' | 'paid') => void;
  onDelete: (entry: InvoiceIndexEntry) => void;
}

/**
 * A single row in the invoice list, with row action buttons.
 */
export function InvoiceRow({
  item,
  onOpen,
  onDuplicate,
  onMarkStatus,
  onDelete,
}: InvoiceRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <tr className="invoice-row">
        <td className="invoice-row__number">{item.entry.number}</td>
        <td className="invoice-row__client">{item.entry.client}</td>
        <td className="invoice-row__total">{item.totalFormatted}</td>
        <td className="invoice-row__status">
          <StatusBadge status={item.entry.status} />
        </td>
        <td className="invoice-row__date">{item.entry.updatedAt}</td>
        <td className="invoice-row__actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpen(item.entry)}
            aria-label={`Open invoice ${item.entry.number}`}
          >
            Open
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(item.entry)}
            aria-label={`Duplicate invoice ${item.entry.number}`}
          >
            Duplicate
          </Button>
          {item.entry.status === 'draft' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkStatus(item.entry, 'sent')}
              aria-label={`Mark ${item.entry.number} as sent`}
            >
              Mark sent
            </Button>
          )}
          {(item.entry.status === 'draft' || item.entry.status === 'sent') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkStatus(item.entry, 'paid')}
              aria-label={`Mark ${item.entry.number} as paid`}
            >
              Mark paid
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label={`Delete invoice ${item.entry.number}`}
          >
            Delete
          </Button>
        </td>
      </tr>

      <Dialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete invoice"
      >
        <p>
          Are you sure you want to delete <strong>{item.entry.number}</strong>?
          This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setShowDeleteConfirm(false);
              onDelete(item.entry);
            }}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
}
