/**
 * useFocusTrap — traps Tab/Shift+Tab focus within a container.
 *
 * When Tab is pressed on the last focusable element, focus wraps to the first.
 * When Shift+Tab is pressed on the first, focus wraps to the last.
 * Also handles Escape to call onClose.
 *
 * Elements with aria-label="Close dialog" are excluded from tab trapping
 * since they are accessible via Escape key.
 */
import { useEffect } from 'react';

/** Selector for all natively focusable elements. */
const FOCUSABLE_SELECTOR = [
  'button:not([disabled]):not([aria-label="Close dialog"]):not([aria-label="Close drawer"])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;

    const handleKeydown = (e: KeyboardEvent) => {
      // Escape closes the overlay
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Tab trapping only when focus is inside the container
      if (e.key === 'Tab') {
        const focusable: HTMLElement[] = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => !el.hasAttribute('disabled') && isVisible(el));

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          // Shift+Tab: if at first (or outside), wrap to last
          if (active === first || !container.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab: if at last (or outside), wrap to first
          if (active === last || !container.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isOpen, onClose, containerRef]);
}

/** Check if an element is visible (not hidden by CSS). */
function isVisible(el: HTMLElement): boolean {
  if (el.getAttribute('tabindex') === '-1') return false;
  const style = el.style;
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  return true;
}
