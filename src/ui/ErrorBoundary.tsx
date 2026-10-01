/**
 * ErrorBoundary — catches render errors and provides an escape hatch.
 *
 * The "Export my data" button lets users salvage their data when the app crashes.
 */
import { Component, type ErrorInfo } from 'react';
import type { AppState } from '../state/store';
import type { InvoiceRepository } from '../storage/repository';
import { toYaml } from '../domain';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  state: AppState;
  repository: InvoiceRepository;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  /** Trigger a YAML backup download. */
  handleExport = (): void => {
    const { state, repository } = this.props;
    const docs: string[] = [];

    docs.push('type: profile');
    docs.push(JSON.stringify(state.profile, null, 2));

    docs.push('type: clients');
    docs.push(JSON.stringify(state.clients, null, 2));

    for (const entry of state.index) {
      const invoice = repository.getInvoice(entry.id);
      if (invoice) {
        docs.push(toYaml(invoice));
      }
    }

    const blob = new Blob([docs.join('\n')], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoicegen-backup-${new Date().toISOString().slice(0, 10)}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <h2>Something went wrong</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </p>
        {this.state.error && (
          <details style={{ textAlign: 'left', marginBottom: 'var(--spacing-lg)' }}>
            <summary style={{ cursor: 'pointer' }}>Error details</summary>
            <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
              {this.state.error.stack}
            </pre>
          </details>
        )}
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center' }}>
          <button
            className="button button--secondary"
            onClick={() => {
              localStorage.removeItem('invoicegen:onboarding:done');
              window.location.reload();
            }}
          >
            Reset &amp; Reload
          </button>
          <button className="button button--primary" onClick={this.handleExport}>
            Export my data
          </button>
        </div>
      </div>
    );
  }
}
