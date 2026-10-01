/**
 * HelpDialog — modal listing keyboard shortcuts.
 */
import './HelpDialog.css';
import { Dialog } from '.';

/** Keyboard shortcuts list — stable reference outside component. */
const SHORTCUTS = [
  { keys: ['Ctrl', 'S'], label: 'Save invoice' },
  { keys: ['Ctrl', 'P'], label: 'Print invoice' },
  { keys: ['Ctrl', 'K'], label: 'Toggle invoice list' },
  { keys: ['Ctrl', 'Enter'], label: 'Add line item' },
  { keys: ['?'], label: 'Show this help' },
];

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Keyboard shortcuts help dialog.
 */
export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
      <div className="help-dialog">
        <dl className="help-dialog__list">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.label} className="help-dialog__row">
              <dt>
                {shortcut.keys.map((key, ki) => (
                  <span key={`${shortcut.label}-${ki}`} className="help-dialog__keys">
                    {ki > 0 && ' + '}
                    <kbd>{key}</kbd>
                  </span>
                ))}
              </dt>
              <dd>{shortcut.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Dialog>
  );
}
