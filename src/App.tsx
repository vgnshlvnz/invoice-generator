/**
 * App — main entry point with header, invoice form, and feature drawers.
 *
 * Handles: error boundary, onboarding dialog, keyboard shortcuts,
 * help dialog, and lazy-loaded feature components.
 */
import { useState, useCallback, useEffect, useRef, Suspense, lazy } from 'react';
import { useAppState } from './state/store';
import { InvoiceForm } from './features/invoice-form';
import { Button, OnboardingDialog, HelpDialog, ErrorBoundary } from './ui';

// Lazy-loaded feature components (code-split)
const SettingsDialog = lazy(() => import('./features/settings/SettingsDialog').then((mod) => ({ default: mod.SettingsDialog })));
const InvoicesDrawer = lazy(() => import('./features/invoices/InvoicesDrawer').then((mod) => ({ default: mod.InvoicesDrawer })));

/** Suspense fallback for lazy-loaded components. */
function SuspenseFallback() {
  return <div className="invoice-form__section" aria-live="polite">Loading…</div>;
}

function App() {
  const { state, dispatch, repository } = useAppState();
  const [showInvoices, setShowInvoices] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Refs for keyboard shortcut handlers (avoid stale closures)
  const toggleInvoicesRef = useRef<(() => void) | null>(null);
  const saveRef = useRef<(() => void) | null>(null);
  const helpRef = useRef<(() => void) | null>(null);

  // ── Refs wiring ──────────────────────────────────────────────

  toggleInvoicesRef.current = useCallback(() => {
    setShowInvoices((v) => !v);
  }, []);

  saveRef.current = useCallback(() => {
    try {
      repository.saveInvoice(state.invoice.invoice);
      dispatch({ type: 'SAVE_OK' });
    } catch {
      dispatch({ type: 'SAVE_ERR', error: 'Save failed' });
    }
  }, [repository, state.invoice.invoice, dispatch]);

  helpRef.current = useCallback(() => {
    setShowHelp((v) => !v);
  }, []);

  // ── Show onboarding if flagged ───────────────────────────────

  useEffect(() => {
    if (state.onboarding.show) {
      setShowOnboarding(true);
    }
  }, [state.onboarding.show]);

  // ── Keyboard shortcuts ───────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;
      const activeTag = document.activeElement?.tagName;
      const inInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

      // Ctrl/Cmd+S — save
      if (isModifier && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        saveRef.current?.();
        return;
      }

      // Ctrl/Cmd+P — print
      if (isModifier && e.key === 'p') {
        e.preventDefault();
        window.print();
        return;
      }

      // Ctrl/Cmd+K — toggle invoice list
      if (isModifier && e.key === 'k') {
        e.preventDefault();
        toggleInvoicesRef.current?.();
        return;
      }

      // Ctrl/Cmd+Enter — add line item
      if (isModifier && e.key === 'Enter') {
        e.preventDefault();
        dispatch({ type: 'ADD_ITEM' });
        return;
      }

      // ? — help dialog (only when not in an input)
      if (e.key === '?' && !inInput) {
        e.preventDefault();
        helpRef.current?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  // ── Onboarding handlers ──────────────────────────────────────

  const handleOnboardingSave = useCallback(() => {
    dispatch({ type: 'SET_ONBOARDING_DONE' });
    setShowOnboarding(false);
  }, [dispatch]);

  const handleOnboardingSkip = useCallback(() => {
    dispatch({ type: 'SET_ONBOARDING_DONE' });
    setShowOnboarding(false);
  }, [dispatch]);

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
        <InvoiceForm />
      </main>

      {/* Onboarding dialog */}
      {showOnboarding && (
        <OnboardingDialog
          isOpen={showOnboarding}
          onClose={handleOnboardingSave}
          initialProfile={state.profile}
          onSave={(profile) => {
            dispatch({ type: 'SET_PROFILE', profile });
            repository.saveProfile(profile as typeof state.profile);
          }}
          onSkip={handleOnboardingSkip}
        />
      )}

      {/* Help dialog */}
      <HelpDialog isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Lazy-loaded feature drawers */}
      <Suspense fallback={<SuspenseFallback />}>
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
      </Suspense>
    </div>
  );
}

export default function AppShell() {
  const { state, repository } = useAppState();

  return (
    <ErrorBoundary state={state} repository={repository}>
      <App />
    </ErrorBoundary>
  );
}
