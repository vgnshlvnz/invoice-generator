/**
 * Drawer — slide-in panel from the right edge of the viewport.
 */
import { useEffect, useRef } from 'react';
import './Drawer.css';
import type { ReactNode } from 'react';

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
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  width = '480px',
}: DrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

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
    <div
      className="drawer"
      style={{ '--drawer-width': width } as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div className="drawer__overlay" onClick={onClose} />
      <aside className="drawer__panel">
        <div className="drawer__header">
          <h2 id="drawer-title" className="drawer__title">{title}</h2>
          <button
            ref={closeRef}
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
