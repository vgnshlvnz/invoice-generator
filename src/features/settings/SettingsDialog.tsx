/**
 * Settings dialog — seller profile, defaults, numbering, theme, storage.
 */
import { useState } from 'react';
import { useAppState } from '../../state/store';
import { Dialog, Button, Field } from '../../ui';
import { StorageMeter } from '../../ui/StorageMeter';
import { nextInvoiceNumber, DEFAULT_PATTERN } from '../../domain';
import type { Profile } from '../../domain';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'profile' | 'defaults' | 'numbering' | 'appearance' | 'danger';

/**
 * A dialog for configuring seller profile, defaults, numbering, theme, and storage.
 */
export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { state, dispatch } = useAppState();

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Profile state
  const [profile, setProfile] = useState<Profile>({ ...state.profile });

  // Defaults state
  const [defaultCurrency, setDefaultCurrency] = useState(
    profile.seller.name ? 'MYR' : 'MYR',
  );
  const [paymentTerms, setPaymentTerms] = useState('14');
  const [defaultNotes, setDefaultNotes] = useState('');
  const [defaultTerms, setDefaultTerms] = useState('');

  // Numbering state
  const [numberingPattern, setNumberingPattern] = useState(
    profile.numbering.prefix || DEFAULT_PATTERN,
  );
  const [numberingSeq, setNumberingSeq] = useState(
    profile.numbering.sequenceStart.toString(),
  );

  // Theme state
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');

  // Storage meter value (computed once)
  const [bytesUsed, setBytesUsed] = useState(0);

  // Calculate localStorage usage on mount
  if (isOpen && bytesUsed === 0) {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) total += key.length + (localStorage.getItem(key)?.length ?? 0) * 2; // UTF-16 chars
    }
    setBytesUsed(total);
  }

  /** Save the profile to repository and state. */
  const handleSaveProfile = () => {
    dispatch({ type: 'SET_PROFILE', profile });
    onClose();
  };

  /** Clear all data from repository. */
  const handleClearAll = () => {
    // Clear localStorage directly
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('invoicegen:v1:')) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      localStorage.removeItem(key);
    }

    // Reset state
    dispatch({ type: 'SET_INDEX', index: [] });
    dispatch({ type: 'SET_PROFILE', profile: {
      seller: { name: '', email: '', phone: '', address: '', taxId: '', bank: { name: '', accountName: '', accountNumber: '' } },
      numbering: { prefix: DEFAULT_PATTERN, yearStart: new Date().getFullYear(), sequenceStart: 1 },
    }});
    dispatch({ type: 'SET_CLIENTS', clients: [] });
    onClose();
  };

  /** Generate a numbering example with the current pattern. */
  const numberingExample = nextInvoiceNumber(
    numberingPattern,
    parseInt(numberingSeq, 10) || 0,
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="settings-dialog">
        {/* Tabs */}
        <div className="settings-tabs">
          {(['profile', 'defaults', 'numbering', 'appearance', 'danger'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`settings-tab${activeTab === tab ? ' settings-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {/* Seller profile tab */}
          {activeTab === 'profile' && (
            <div className="settings-section">
              <Field label="Seller name" id="seller-name">
                <input
                  type="text"
                  value={profile.seller.name}
                  onChange={(e) => setProfile((p) => ({ ...p, seller: { ...p.seller, name: e.target.value } }))}
                />
              </Field>
              <Field label="Email" id="seller-email">
                <input
                  type="email"
                  value={profile.seller.email}
                  onChange={(e) => setProfile((p) => ({ ...p, seller: { ...p.seller, email: e.target.value } }))}
                />
              </Field>
              <Field label="Phone" id="seller-phone">
                <input
                  type="tel"
                  value={profile.seller.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, seller: { ...p.seller, phone: e.target.value } }))}
                />
              </Field>
              <Field label="Address" id="seller-address">
                <input
                  type="text"
                  value={profile.seller.address}
                  onChange={(e) => setProfile((p) => ({ ...p, seller: { ...p.seller, address: e.target.value } }))}
                />
              </Field>
              <Field label="Tax ID" id="seller-tax-id">
                <input
                  type="text"
                  value={profile.seller.taxId}
                  onChange={(e) => setProfile((p) => ({ ...p, seller: { ...p.seller, taxId: e.target.value } }))}
                />
              </Field>
              <Field label="Bank name" id="bank-name">
                <input
                  type="text"
                  value={profile.seller.bank.name}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      seller: { ...p.seller, bank: { ...p.seller.bank, name: e.target.value } },
                    }))
                  }
                />
              </Field>
              <Field label="Account name" id="account-name">
                <input
                  type="text"
                  value={profile.seller.bank.accountName}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      seller: { ...p.seller, bank: { ...p.seller.bank, accountName: e.target.value } },
                    }))
                  }
                />
              </Field>
              <Field label="Account number" id="account-number">
                <input
                  type="text"
                  value={profile.seller.bank.accountNumber}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      seller: { ...p.seller, bank: { ...p.seller.bank, accountNumber: e.target.value } },
                    }))
                  }
                />
              </Field>
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <Button variant="primary" onClick={handleSaveProfile}>
                  Save profile
                </Button>
              </div>
            </div>
          )}

          {/* Defaults tab */}
          {activeTab === 'defaults' && (
            <div className="settings-section">
              <Field label="Default currency" id="default-currency">
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                >
                  <option value="MYR">MYR</option>
                  <option value="USD">USD</option>
                  <option value="SGD">SGD</option>
                  <option value="EUR">EUR</option>
                  <option value="JPY">JPY</option>
                </select>
              </Field>
              <Field label="Payment terms (days)" id="payment-terms">
                <input
                  type="number"
                  min="0"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                />
              </Field>
              <Field label="Default notes" id="default-notes">
                <textarea
                  rows={3}
                  value={defaultNotes}
                  onChange={(e) => setDefaultNotes(e.target.value)}
                />
              </Field>
              <Field label="Default terms" id="default-terms">
                <textarea
                  rows={3}
                  value={defaultTerms}
                  onChange={(e) => setDefaultTerms(e.target.value)}
                />
              </Field>
            </div>
          )}

          {/* Numbering tab */}
          {activeTab === 'numbering' && (
            <div className="settings-section">
              <Field label="Numbering pattern" id="numbering-pattern">
                <input
                  type="text"
                  value={numberingPattern}
                  onChange={(e) => setNumberingPattern(e.target.value)}
                />
              </Field>
              <Field label="Sequence start" id="numbering-seq">
                <input
                  type="number"
                  min="1"
                  value={numberingSeq}
                  onChange={(e) => setNumberingSeq(e.target.value)}
                />
              </Field>
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <strong>Live example:</strong>{' '}
                <code style={{ fontSize: 'var(--font-size-lg)' }}>{numberingExample}</code>
              </div>
            </div>
          )}

          {/* Appearance tab */}
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <Field label="Theme" id="theme-select">
                <select value={theme} onChange={(e) => setTheme(e.target.value as typeof theme)}>
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </Field>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-sm)' }}>
                Theme preference is stored in localStorage.
              </p>
            </div>
          )}

          {/* Danger zone */}
          {activeTab === 'danger' && (
            <div className="settings-section">
              <h4>Storage usage</h4>
              <StorageMeter bytesUsed={bytesUsed} />
              <hr style={{ margin: 'var(--spacing-lg) 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />
              <h4 style={{ color: 'var(--color-danger)' }}>Clear all data</h4>
              <p style={{ fontSize: '0.875rem' }}>
                This will permanently delete all invoices, the profile, and saved clients.
              </p>
              <Field label="Type DELETE to confirm" id="delete-confirm">
                <input
                  type="text"
                  placeholder="DELETE"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                />
              </Field>
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <Button
                  variant="danger"
                  disabled={deleteConfirm !== 'DELETE'}
                  onClick={handleClearAll}
                >
                  Clear all data
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
