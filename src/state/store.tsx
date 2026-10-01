/**
 * State layer — React context + useReducer for the invoice app.
 *
 * Manages current invoice, YAML text, validation errors, dirty state,
 * save status, index, and provides CRUD actions.
 */
import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import type { Invoice, InvoiceIndexEntry, Profile, SavedClient } from '../domain';
import { createEmptyInvoice } from '../domain';
import { fromYaml, toYaml } from '../domain';
import type { InvoiceRepository } from '../storage/repository';

// ── Types ──────────────────────────────────────────────────────────────

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** A versioned invoice snapshot. */
interface InvoiceState {
  invoice: Invoice;
  yamlText: string;
  yamlErrors: { path: string; message: string; line?: number; col?: number }[];
  dirty: boolean;
  saveStatus: SaveStatus;
}

/** Full application state. */
export interface AppState {
  invoice: InvoiceState;
  index: InvoiceIndexEntry[];
  profile: Profile;
  clients: SavedClient[];
  onboarding: { show: boolean; done: boolean };
}

/** Actions dispatched by the reducer. */
export type Action =
  | { type: 'LOAD'; payload: Invoice }
  | { type: 'NEW' }
  | { type: 'UPDATE_FIELD'; path: string; value: unknown }
  | { type: 'ADD_ITEM' }
  | { type: 'REMOVE_ITEM'; index: number }
  | { type: 'MOVE_ITEM'; from: number; to: number }
  | { type: 'SET_YAML_TEXT'; text: string }
  | { type: 'SAVE_OK' }
  | { type: 'SAVE_ERR'; error: string }
  | { type: 'SET_INDEX'; index: InvoiceIndexEntry[] }
  | { type: 'SET_PROFILE'; profile: Profile }
  | { type: 'SET_CLIENTS'; clients: SavedClient[] }
  | { type: 'DELETE' }
  | { type: 'DUPLICATE'; invoice: Invoice }
  | { type: 'SET_ONBOARDING_DONE' }
  | { type: 'TRIGGER_ONBOARDING' };

/** Initial invoice state. */
function initialInvoiceState(): InvoiceState {
  const invoice = createEmptyInvoice(undefined, new Date());
  const yamlText = toYaml(invoice);
  return {
    invoice,
    yamlText,
    yamlErrors: [],
    dirty: false,
    saveStatus: 'idle',
  } as InvoiceState;
}

/** Deep clone an object via JSON. */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Create a new invoice number string. */
function generateNumber(index: InvoiceIndexEntry[]): string {
  const year = new Date().getFullYear();
  const existing = index.filter((e) => e.number.startsWith(`INV-${year}`));
  const maxSeq = existing.reduce((max, e) => {
    const match = e.number.match(/INV-\d{4}-(\d{4})$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `INV-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
}

/** The reducer function. */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD': {
      const invoice = action.payload;
      const yamlText = toYaml(invoice);
      return {
        ...state,
        invoice: { ...state.invoice, invoice, yamlText, dirty: false, saveStatus: 'idle', yamlErrors: [] },
      };
    }

    case 'NEW': {
      const newInvoice = createEmptyInvoice(undefined, new Date());
      newInvoice.number = generateNumber(state.index);
      const yamlText = toYaml(newInvoice);
      return {
        ...state,
        invoice: { ...state.invoice, invoice: newInvoice, yamlText, dirty: true, saveStatus: 'idle', yamlErrors: [] },
      };
    }

    case 'UPDATE_FIELD': {
      const { path, value } = action;
      const updated = deepClone(state.invoice.invoice);

      // Navigate dot-separated path and set value
      const parts = path.split('.');
      let current: unknown = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        current = (current as Record<string, unknown>)[parts[i]];
      }
      (current as Record<string, unknown>)[parts[parts.length - 1]] = value;

      return {
        ...state,
        invoice: {
          ...state.invoice,
          invoice: updated,
          yamlText: toYaml(updated),
          yamlErrors: [],
          dirty: true,
          saveStatus: 'idle',
        },
      };
    }

    case 'ADD_ITEM': {
      const updated = { ...state.invoice.invoice };
      const item = {
        id: `${updated.id}_item_${Date.now()}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
      };
      updated.items = [...updated.items, item];
      return {
        ...state,
        invoice: {
          ...state.invoice,
          invoice: updated,
          yamlText: toYaml(updated),
          yamlErrors: [],
          dirty: true,
          saveStatus: 'idle',
        },
      };
    }

    case 'REMOVE_ITEM': {
      const updated = { ...state.invoice.invoice };
      updated.items = updated.items.filter((_, i) => i !== action.index);
      return {
        ...state,
        invoice: {
          ...state.invoice,
          invoice: updated,
          yamlText: toYaml(updated),
          yamlErrors: [],
          dirty: true,
          saveStatus: 'idle',
        },
      };
    }

    case 'MOVE_ITEM': {
      const updated = { ...state.invoice.invoice };
      const items = [...updated.items];
      const [moved] = items.splice(action.from, 1);
      items.splice(action.to, 0, moved);
      updated.items = items;
      return {
        ...state,
        invoice: {
          ...state.invoice,
          invoice: updated,
          yamlText: toYaml(updated),
          yamlErrors: [],
          dirty: true,
          saveStatus: 'idle',
        },
      };
    }

    case 'SET_YAML_TEXT': {
      const result = fromYaml(action.text);
      if (result.ok) {
        return {
          ...state,
          invoice: {
            ...state.invoice,
            invoice: result.invoice,
            yamlText: action.text,
            dirty: true,
            saveStatus: 'idle',
            yamlErrors: [],
          },
        };
      }
      return {
        ...state,
        invoice: {
          ...state.invoice,
          yamlText: action.text,
          yamlErrors: result.errors,
          dirty: true,
          saveStatus: 'idle',
          // Keep the last valid invoice
        },
      };
    }

    case 'SAVE_OK': {
      return {
        ...state,
        invoice: { ...state.invoice, dirty: false, saveStatus: 'saved' },
      };
    }

    case 'SAVE_ERR': {
      return {
        ...state,
        invoice: { ...state.invoice, saveStatus: 'error' },
      };
    }

    case 'SET_INDEX': {
      return { ...state, index: action.index };
    }

    case 'SET_PROFILE': {
      return { ...state, profile: action.profile };
    }

    case 'SET_CLIENTS': {
      return { ...state, clients: action.clients };
    }

    case 'DELETE': {
      // Return to initial state
      const init = initialInvoiceState();
      return {
        ...state,
        invoice: init,
        index: state.index.filter((e) => e.id !== state.invoice.invoice.id),
      };
    }

    case 'SET_ONBOARDING_DONE': {
      localStorage.setItem('invoicegen:onboarding:done', 'true');
      return { ...state, onboarding: { ...state.onboarding, show: false, done: true } };
    }

    case 'TRIGGER_ONBOARDING': {
      const profile = state.profile;
      const needsOnboarding = !profile.seller.name || !profile.seller.email;
      return { ...state, onboarding: { ...state.onboarding, show: needsOnboarding } };
    }

    case 'DUPLICATE': {
      return {
        ...state,
        invoice: {
          ...state.invoice,
          invoice: action.invoice,
          yamlText: toYaml(action.invoice),
          dirty: true,
          saveStatus: 'idle',
        },
      };
    }

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
  repository: InvoiceRepository;
} | null>(null);

// ── Provider ───────────────────────────────────────────────────────────

const AUTOSAVE_DELAY = 600; // ms

interface AppProviderProps {
  repository: InvoiceRepository;
  children: React.ReactNode;
}

/** Full initial state (merged with repository data). */
function buildInitialState(repo: InvoiceRepository): AppState {
  const profile = repo.getProfile();
  const onboardingDone = localStorage.getItem('invoicegen:onboarding:done') === 'true';
  const needsOnboarding = !profile.seller.name || !profile.seller.email;

  return {
    invoice: initialInvoiceState(),
    index: repo.listInvoices(),
    profile,
    clients: repo.getClients(),
    onboarding: {
      show: !onboardingDone && needsOnboarding,
      done: onboardingDone,
    },
  };
}

export function AppProvider({ repository, children }: AppProviderProps) {
  const initialState = buildInitialState(repository);

  const [state, dispatch] = useReducer(reducer, initialState);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load on mount ──────────────────────────────────────────────────
  useEffect(() => {
    dispatch({ type: 'SET_INDEX', index: repository.listInvoices() });
    dispatch({ type: 'SET_PROFILE', profile: repository.getProfile() });
    dispatch({ type: 'SET_CLIENTS', clients: repository.getClients() });
  }, []);

  // ── Autosave ───────────────────────────────────────────────────────
  const save = useCallback(() => {
    const { invoice } = state.invoice;
    if (!invoice) return;

    dispatch({ type: 'SAVE_OK' }); // optimistic update
    try {
      repository.saveInvoice(invoice);
      dispatch({ type: 'SAVE_OK' });
    } catch (e) {
      dispatch({ type: 'SAVE_ERR', error: String(e) });
    }
  }, [state.invoice.invoice, repository]);

  // Debounced autosave
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (!state.invoice.dirty) return;
    saveTimerRef.current = setTimeout(save, AUTOSAVE_DELAY);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state.invoice.dirty, state.invoice.invoice.id, save]);

  // Save on beforeunload
  useEffect(() => {
    const handler = () => save();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [save]);

  // ── Cross-tab sync (storage event) ────────────────────────────────
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith('invoicegen:v1:')) {
        // Reload affected data
        const index = repository.listInvoices();
        dispatch({ type: 'SET_INDEX', index });
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [repository]);

  return (
    <AppContext.Provider value={{ state, dispatch, repository }}>
      {children}
    </AppContext.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}

export function useInvoice() {
  const { state, dispatch, repository } = useAppState();
  return {
    invoice: state.invoice.invoice,
    yamlText: state.invoice.yamlText,
    yamlErrors: state.invoice.yamlErrors,
    dirty: state.invoice.dirty,
    saveStatus: state.invoice.saveStatus,
    dispatch,
    repository,
  };
}

export function useInvoiceIndex() {
  const { state } = useAppState();
  return { index: state.index };
}

export function useProfile() {
  const { state, dispatch, repository } = useAppState();
  return {
    profile: state.profile,
    dispatch,
    repository,
  };
}

export function useClients() {
  const { state, dispatch, repository } = useAppState();
  return {
    clients: state.clients,
    dispatch,
    repository,
  };
}
