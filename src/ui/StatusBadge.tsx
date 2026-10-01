/**
 * StatusBadge — colored chip showing invoice status.
 */

type Status = 'draft' | 'sent' | 'paid' | 'void';

const STATUS_COLORS: Record<Status, string> = {
  draft: '#9ca3af',
  sent: '#3b82f6',
  paid: '#16a34a',
  void: '#dc2626',
};

const STATUS_LABELS: Record<Status, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  void: 'Void',
};

interface StatusBadgeProps {
  status: Status;
}

/**
 * Small colored chip displaying the status.
 * Inline styles avoid a separate CSS file for this simple component.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className="status-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.8rem',
        fontWeight: 500,
        color: STATUS_COLORS[status],
        textTransform: 'capitalize',
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: STATUS_COLORS[status],
        }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
