/**
 * Drawer — slide-in panel from the right edge of the viewport.
 */
import { useEffect, useRef } from 'react';
import './Drawer.css';
import type { ReactNode } from 'react';
import { useFocusTrap } from './useFocusTrap';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}

/**
 * A right-side drawer panel that slides in when open.
 * Closes on Escape key and overlay click.
 * Traps focus within the drawer when open.
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  width = '480px',
}: DrawerProps) {
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
      className="drawer"
      style={{ '--drawer-width': width } as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div
        className="drawer__overlay"
        onClick={onClose}
        ref={overlayRef}
        tabIndex={-1}
      />
      <aside className="drawer__panel">
        <div className="drawer__header">
          <h2 id="drawer-title" className="drawer__title">{title}</h2>
          <button
            className="drawer__close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            &times;
          </button>
        </div>
        <div className="drawer__body">{children}</div>
      </aside>
    </div>
  );
}
