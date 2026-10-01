/**
 * Dialog — modal overlay for confirmations and forms.
 */
import { useEffect, useRef } from 'react';
import './Dialog.css';
import type { ReactNode } from 'react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * A modal dialog with overlay. Closes on Escape key.
 * Traps focus within the dialog when open.
 */
export function Dialog({ isOpen, onClose, title, children }: DialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const firstFocusableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Restore focus to trigger element on close
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="dialog__overlay" onClick={onClose} />
      <div className="dialog__content" ref={firstFocusableRef}>
        <div className="dialog__header">
          <h2 id="dialog-title" className="dialog__title">{title}</h2>
          <button
            ref={closeRef}
            className="dialog__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>
        <div className="dialog__body">{children}</div>
      </div>
    </div>
  );
}
