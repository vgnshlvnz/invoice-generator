/**
 * App — main entry point with header and feature components.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppState } from './state/store';
import { InvoicesDrawer, ImportExport } from './features/invoices';
import { SettingsDialog } from './features/settings';
import { Button } from './ui';

function App() {
  const { state, repository } = useAppState();
  const [showInvoices, setShowInvoices] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const handleRef = useRef<(() => void) | null>(null);

  // Ctrl/Cmd+K opens invoice drawer
  handleRef.current = useCallback(() => {
    setShowInvoices((v) => !v);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <h1>Invoice Generator</h1>
        <div className="app-header-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowInvoices((v) => !v)}
            aria-label="Toggle invoice list"
          >
            Invoices {state.index.length > 0 && `(${state.index.length})`}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSettings(true)}
            aria-label="Open settings"
          >
            Settings
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main>
        <section className="app-import-export">
          <ImportExport repository={repository} />
        </section>
      </main>

      {/* Feature drawers */}
      <InvoicesDrawer
        isOpen={showInvoices}
        onClose={() => setShowInvoices(false)}
        repository={repository}
        onNewInvoice={() => setShowInvoices(false)}
      />
      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

export default App;
