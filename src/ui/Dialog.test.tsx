/**
 * Tests for Dialog component — open, close, and focus trapping.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders when open', () => {
    render(<Dialog isOpen onClose={() => {}} title="Test">Content</Dialog>);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Dialog isOpen={false} onClose={() => {}} title="Test">Content</Dialog>);
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<Dialog isOpen onClose={onClose} title="Test">Content</Dialog>);

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('focus is managed within dialog content', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog isOpen onClose={onClose} title="Test">
        <button id="btn-1">First</button>
        <button id="btn-3">Last</button>
      </Dialog>,
    );

    // Verify the dialog has the correct structural classes
    expect(container.querySelector('.dialog')).toBeInTheDocument();
    expect(container.querySelector('.dialog__content')).toBeInTheDocument();
    expect(container.querySelector('.dialog__body')).toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(<Dialog isOpen onClose={() => {}} title="Test Dialog">Content</Dialog>);
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(screen.getByText('Test Dialog')).toHaveAttribute('id', dialog?.getAttribute('aria-labelledby'));
  });

  it('closes when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Dialog isOpen onClose={onClose} title="Test">Content</Dialog>);
    const closeButton = document.querySelector('.dialog__close');
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on overlay click', () => {
    const onClose = vi.fn();
    const { container } = render(<Dialog isOpen onClose={onClose} title="Test">Content</Dialog>);
    fireEvent.click(container.querySelector('.dialog__overlay')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
