/**
 * Tests for HelpDialog component.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpDialog } from './HelpDialog';

describe('HelpDialog', () => {
  it('renders all keyboard shortcuts', () => {
    render(<HelpDialog isOpen onClose={() => {}} />);
    expect(screen.getByText('Save invoice')).toBeInTheDocument();
    expect(screen.getByText('Print invoice')).toBeInTheDocument();
    expect(screen.getByText('Toggle invoice list')).toBeInTheDocument();
    expect(screen.getByText('Add line item')).toBeInTheDocument();
    expect(screen.getByText('Show this help')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<HelpDialog isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    expect(screen.queryByText('Save invoice')).not.toBeInTheDocument();
  });

  it('closes when close button is clicked', () => {
    const onClose = vi.fn();
    render(<HelpDialog isOpen onClose={onClose} />);
    const closeButton = document.querySelector('.dialog__close');
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
