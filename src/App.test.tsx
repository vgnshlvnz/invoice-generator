import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppProvider } from './state/store';
import { createRepository } from './storage/repository';
import App from './App';

describe('App', () => {
  it('renders the page title', () => {
    const repository = createRepository();
    render(
      <AppProvider repository={repository}>
        <App />
      </AppProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Invoice Generator' })).toBeInTheDocument();
  });
});
