/**
 * Dialog — modal overlay for confirmations and forms.
 */
import { useEffect, useRef } from 'react';
import './Dialog.css';
import type { ReactNode } from 'react';
import { useFocusTrap } from './useFocusTrap';

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
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus trap via custom hook
  useFocusTrap(overlayRef as React.RefObject<HTMLElement | null>, isOpen, onClose);

  // Initial focus on overlay when opened
  useEffect(() => {
    if (!isOpen) return;
    overlayRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        className="dialog__overlay"
        onClick={onClose}
        ref={overlayRef}
        tabIndex={-1}
      />
      <div className="dialog__content">
        <div className="dialog__header">
          <h2 id="dialog-title" className="dialog__title">{title}</h2>
          <button
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
