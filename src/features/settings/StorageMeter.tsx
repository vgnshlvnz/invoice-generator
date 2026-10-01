/**
 * Storage usage meter — shows approximate bytes used in localStorage.
 * Displays as a percentage of a 5MB budget with a warning at 80%.
 */

export interface StorageMeterProps {
  /** Current bytes used (usually from window.localStorage.length) */
  bytesUsed: number;
  /** Budget in bytes (default 5MB) */
  budget?: number;
}

const DEFAULT_BUDGET = 5 * 1024 * 1024; // 5MB

export function StorageMeter({ bytesUsed, budget = DEFAULT_BUDGET }: StorageMeterProps) {
  const percentage = Math.min((bytesUsed / budget) * 100, 100);
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 95;

  const color = isCritical ? 'var(--color-danger)' : isWarning ? '#f59e0b' : 'var(--color-primary)';

  return (
    <div className="storage-meter" role="meter" aria-valuenow={Math.round(percentage)} aria-valuemin={0} aria-valuemax={100} aria-label="Storage usage">
      <div className="storage-meter-bar" style={{ width: `${percentage}%`, backgroundColor: color }} />
      <div className="storage-meter-label">
        {isWarning && (
          <span className="storage-warning">⚠️ Warning: storage is {percentage.toFixed(0)}% full</span>
        )}
        <span className="storage-text">
          {bytesUsed.toLocaleString()} / {budget.toLocaleString()} bytes
        </span>
      </div>
    </div>
  );
}
