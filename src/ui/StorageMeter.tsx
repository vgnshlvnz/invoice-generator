/**
 * StorageMeter — visual indicator of localStorage usage.
 * Budget: 5 MB with warning at 80%.
 */

const BUDGET_BYTES = 5 * 1024 * 1024; // 5 MB

interface StorageMeterProps {
  /** Approximate bytes currently used in localStorage. */
  bytesUsed: number;
}

/**
 * Shows a progress bar and usage text.
 * Warns when usage exceeds 80% of the 5 MB budget.
 */
export function StorageMeter({ bytesUsed }: StorageMeterProps) {
  const percentage = Math.min((bytesUsed / BUDGET_BYTES) * 100, 100);
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 100;

  const color = isCritical
    ? 'var(--color-danger)'
    : isWarning
      ? '#f59e0b'
      : 'var(--color-primary)';

  const bytesKB = Math.round(bytesUsed / 1024);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div
        style={{
          height: '8px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: color,
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div
        style={{
          fontSize: '0.8rem',
          color: color,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>
          {bytesKB} KB used
          {isWarning ? ' — ⚠ Approaching limit' : ''}
          {isCritical ? ' — Limit reached' : ''}
        </span>
        <span>{percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
}
