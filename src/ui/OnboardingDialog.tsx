/**
 * Onboarding dialog — first-run setup for new users.
 *
 * 3-step flow:
 * 1. Seller details (name, email, phone, address, taxId, bank)
 * 2. Preferences (currency, payment terms)
 * 3. Done
 */
import { useState } from 'react';
import { Button, Field, Dialog } from '.';
import './OnboardingDialog.css';

export interface OnboardingProfile {
  seller: {
    name: string;
    email: string;
    phone: string;
    address: string;
    taxId: string;
    bank: {
      name: string;
      accountName: string;
      accountNumber: string;
    };
  };
  numbering: {
    prefix: string;
    yearStart: number;
    sequenceStart: number;
  };
}

interface OnboardingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfile?: OnboardingProfile;
  onSave: (profile: OnboardingProfile) => void;
  onSkip: () => void;
}

/** Step indicator showing current step (e.g. "1 / 3"). */
function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="onboarding-step-indicator" aria-live="polite">
      Step {step} / {total}
    </div>
  );
}

/** Empty profile used as default state. */
function emptyProfile(): OnboardingProfile {
  return {
    seller: {
      name: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      bank: { name: '', accountName: '', accountNumber: '' },
    },
    numbering: { prefix: 'INV-{YYYY}-{SEQ:4}', yearStart: new Date().getFullYear(), sequenceStart: 1 },
  };
}

export function OnboardingDialog({
  isOpen,
  onClose,
  initialProfile,
  onSave,
  onSkip,
}: OnboardingDialogProps) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<OnboardingProfile>(initialProfile ?? emptyProfile());
  const [currency, setCurrency] = useState('MYR');
  const [paymentTerms, setPaymentTerms] = useState('14');

  const isSellerComplete = () => profile.seller.name.trim() !== '' && profile.seller.email.trim() !== '';

  const handleNext = () => {
    if (step === 1 && !isSellerComplete()) {
      return; // prevent advancing without seller name/email
    }
    if (step < 3) {
      setStep((s) => s + 1);
    }
  };

  const handleDone = () => {
    onSave({
      ...profile,
      numbering: {
        ...profile.numbering,
        prefix: profile.numbering.prefix ?? 'INV-{YYYY}-{SEQ:4}',
      },
    });
    // Also save currency and payment terms if the API supports it later
    onClose();
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} title="Welcome to Invoice Generator" onClose={onSkip}>
      <div className="onboarding-dialog">
        <StepIndicator step={step} total={3} />

        {/* Step 1: Seller Details */}
        {step === 1 && (
          <div className="onboarding-step">
            <p className="onboarding-hint">Let's start with your details. You can always change these later.</p>

            <Field label="Name *" error="" id="onb-name">
              <input
                type="text"
                id="onb-name"
                value={profile.seller.name}
                onChange={(e) => setProfile((p) => ({ ...p, seller: { ...p.seller, name: e.target.value } }))}
                placeholder="Your business name"
                autoFocus
              />
            </Field>

            <Field label="Email *" error="" id="onb-email">
              <input
                type="email"
                id="onb-email"
                value={profile.seller.email}
                onChange={(e) => setProfile((p) => ({ ...p, seller: { ...p.seller, email: e.target.value } }))}
                placeholder="email@business.com"
              />
            </Field>

            <Field label="Phone" error="" id="onb-phone">
              <input
                type="text"
                id="onb-phone"
                value={profile.seller.phone}
                onChange={(e) => setProfile((p) => ({ ...p, seller: { ...p.seller, phone: e.target.value } }))}
                placeholder="+60123456789"
              />
            </Field>

            <Field label="Address" error="" id="onb-address">
              <input
                type="text"
                id="onb-address"
                value={profile.seller.address}
                onChange={(e) => setProfile((p) => ({ ...p, seller: { ...p.seller, address: e.target.value } }))}
                placeholder="123 Business St"
              />
            </Field>

            <Field label="Tax ID" error="" id="onb-taxid">
              <input
                type="text"
                id="onb-taxid"
                value={profile.seller.taxId}
                onChange={(e) => setProfile((p) => ({ ...p, seller: { ...p.seller, taxId: e.target.value } }))}
                placeholder="123456789012"
              />
            </Field>

            {/* Bank Details Section */}
            <h4 className="onboarding-section-title">Bank Details</h4>

            <Field label="Bank Name" error="" id="onb-bank-name">
              <input
                type="text"
                id="onb-bank-name"
                value={profile.seller.bank.name}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    seller: { ...p.seller, bank: { ...p.seller.bank, name: e.target.value } },
                  }))
                }
                placeholder="Maybank"
              />
            </Field>

            <Field label="Account Name" error="" id="onb-account-name">
              <input
                type="text"
                id="onb-account-name"
                value={profile.seller.bank.accountName}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    seller: { ...p.seller, bank: { ...p.seller.bank, accountName: e.target.value } },
                  }))
                }
                placeholder="Business Account"
              />
            </Field>

            <Field label="Account Number" error="" id="onb-account-num">
              <input
                type="text"
                id="onb-account-num"
                value={profile.seller.bank.accountNumber}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    seller: { ...p.seller, bank: { ...p.seller.bank, accountNumber: e.target.value } },
                  }))
                }
                placeholder="1234567890"
              />
            </Field>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <div className="onboarding-step">
            <p className="onboarding-hint">Set your default preferences.</p>

            <Field label="Default Currency" error="" id="onb-currency">
              <select
                id="onb-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="MYR">MYR - Malaysian Ringgit</option>
                <option value="USD">USD - US Dollar</option>
                <option value="SGD">SGD - Singapore Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </Field>

            <Field label="Payment Terms (days)" error="" id="onb-payment-terms">
              <input
                type="number"
                id="onb-payment-terms"
                min={0}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </Field>

            <div className="onboarding-summary">
              <strong>Summary:</strong>
              <ul>
                <li>Currency: {currency}</li>
                <li>Payment terms: {paymentTerms} days</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="onboarding-step onboarding-done">
            <div className="onboarding-done-icon" aria-hidden="true">✓</div>
            <h3>You're all set!</h3>
            <p>You can start creating invoices now. Use <kbd>Ctrl+K</kbd> to open the invoice list.</p>
          </div>
        )}

        {/* Footer buttons */}
        <div className="onboarding-footer">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            {step === 3 ? 'Not now' : 'Skip'}
          </Button>
          {step < 3 ? (
            <Button variant="primary" size="sm" onClick={handleNext} disabled={step === 1 && !isSellerComplete()}>
              {step === 1 ? 'Next' : 'Next'}
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleDone}>
              Done
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
