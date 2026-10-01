/**
 * InvoiceForm — full invoice editing form.
 *
 * Maps sections of the Invoice type to form fields.
 * Each field dispatches UPDATE_FIELD with a dot-path.
 * Items table uses ADD_ITEM / REMOVE_ITEM actions.
 */
import { useCallback } from 'react';
import { useInvoice, useProfile } from '../../state/store';
import { computeTotals, formatMoney } from '../../domain';
import type { DiscountType } from '../../domain';
import './InvoiceForm.css';

/**
 * Invoice editing form.
 *
 * Renders all sections of the Invoice schema as editable fields.
 * Displays a live totals preview at the bottom.
 */
export function InvoiceForm() {
  const { invoice, yamlErrors, dispatch } = useInvoice();
  const { profile } = useProfile();

  const handleChange = useCallback(
    (path: string, value: unknown) => {
      dispatch({ type: 'UPDATE_FIELD', path, value });
    },
    [dispatch],
  );

  const addField = useCallback(
    (path: string, value: string | number | DiscountType) => handleChange(path, value),
    [handleChange],
  );

  const totals = computeTotals(invoice);

  // Pre-fill seller from profile if empty
  const profileSeller = profile?.seller;
  const initialSeller = !invoice.seller.name && profileSeller
    ? {
        name: profileSeller.name,
        email: profileSeller.email,
        phone: profileSeller.phone,
        address: profileSeller.address,
        taxId: profileSeller.taxId,
        bank: profileSeller.bank,
      }
    : invoice.seller;

  return (
    <div className="invoice-form">
      {/* Form-level errors */}
      {yamlErrors.length > 0 && (
        <div className="invoice-form__errors" role="alert" aria-live="assertive">
          <h3>YAML errors</h3>
          <ul>
            {yamlErrors.map((err: { path: string; message: string }, i: number) => (
              <li key={i}>
                <code>{err.path}</code>: {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Invoice Header ──────────────────────────────────────── */}
      <section className="invoice-form__section" aria-labelledby="header-heading">
        <h3 id="header-heading">Invoice</h3>
        <div className="invoice-form__grid">
          <div className="invoice-form__field">
            <label htmlFor="inv-number">Number</label>
            <input
              id="inv-number"
              value={invoice.number}
              onChange={(e) => addField('number', e.target.value)}
              placeholder="Auto-generated"
              aria-describedby="inv-number-desc"
            />
            <span id="inv-number-desc" className="invoice-form__hint">Leave blank for auto-generation</span>
          </div>
          <div className="invoice-form__field">
            <label htmlFor="inv-status">Status</label>
            <select
              id="inv-status"
              value={invoice.status}
              onChange={(e) => addField('status', e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="void">Void</option>
            </select>
          </div>
          <div className="invoice-form__field">
            <label htmlFor="inv-currency">Currency</label>
            <select
              id="inv-currency"
              value={invoice.currency}
              onChange={(e) => addField('currency', e.target.value)}
            >
              <option value="MYR">MYR — Malaysian Ringgit</option>
              <option value="USD">USD — US Dollar</option>
              <option value="SGD">SGD — Singapore Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="JPY">JPY — Japanese Yen</option>
            </select>
          </div>
          <div className="invoice-form__field">
            <label htmlFor="inv-issue-date">Issue Date</label>
            <input
              id="inv-issue-date"
              type="date"
              value={invoice.issueDate}
              onChange={(e) => addField('issueDate', e.target.value)}
            />
          </div>
          <div className="invoice-form__field">
            <label htmlFor="inv-due-date">Due Date</label>
            <input
              id="inv-due-date"
              type="date"
              value={invoice.dueDate}
              onChange={(e) => addField('dueDate', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── Seller ──────────────────────────────────────────────── */}
      <section className="invoice-form__section" aria-labelledby="seller-heading">
        <h3 id="seller-heading">Seller</h3>
        <div className="invoice-form__grid">
          <div className="invoice-form__field invoice-form__field--full">
            <label htmlFor="seller-name">Name</label>
            <input
              id="seller-name"
              value={initialSeller.name}
              onChange={(e) => addField('seller.name', e.target.value)}
              placeholder="Your business name"
            />
          </div>
          <div className="invoice-form__field">
            <label htmlFor="seller-email">Email</label>
            <input
              id="seller-email"
              type="email"
              value={initialSeller.email}
              onChange={(e) => addField('seller.email', e.target.value)}
              placeholder="you@business.com"
            />
          </div>
          <div className="invoice-form__field">
            <label htmlFor="seller-phone">Phone</label>
            <input
              id="seller-phone"
              type="tel"
              value={initialSeller.phone}
              onChange={(e) => addField('seller.phone', e.target.value)}
              placeholder="+60123456789"
            />
          </div>
          <div className="invoice-form__field invoice-form__field--full">
            <label htmlFor="seller-address">Address</label>
            <input
              id="seller-address"
              value={initialSeller.address}
              onChange={(e) => addField('seller.address', e.target.value)}
              placeholder="123 Business St, City, Country"
            />
          </div>
          <div className="invoice-form__field">
            <label htmlFor="seller-taxid">Tax ID</label>
            <input
              id="seller-taxid"
              value={initialSeller.taxId}
              onChange={(e) => addField('seller.taxId', e.target.value)}
              placeholder="123456789012"
            />
          </div>
        </div>

        {/* Bank details */}
        <h4 className="invoice-form__subsection-title">Bank Details</h4>
        <div className="invoice-form__grid">
          <div className="invoice-form__field">
            <label htmlFor="bank-name">Bank Name</label>
            <input
              id="bank-name"
              value={initialSeller.bank.name}
              onChange={(e) => addField('seller.bank.name', e.target.value)}
              placeholder="Maybank"
            />
          </div>
          <div className="invoice-form__field">
            <label htmlFor="bank-account-name">Account Name</label>
            <input
              id="bank-account-name"
              value={initialSeller.bank.accountName}
              onChange={(e) => addField('seller.bank.accountName', e.target.value)}
              placeholder="Business Account"
            />
          </div>
          <div className="invoice-form__field">
            <label htmlFor="bank-account-number">Account Number</label>
            <input
              id="bank-account-number"
              value={initialSeller.bank.accountNumber}
              onChange={(e) => addField('seller.bank.accountNumber', e.target.value)}
              placeholder="1234567890"
            />
          </div>
        </div>
      </section>

      {/* ── Client ──────────────────────────────────────────────── */}
      <section className="invoice-form__section" aria-labelledby="client-heading">
        <h3 id="client-heading">Client</h3>
        <div className="invoice-form__grid">
          <div className="invoice-form__field invoice-form__field--full">
            <label htmlFor="client-name">Name</label>
            <input
              id="client-name"
              value={invoice.client.name}
              onChange={(e) => addField('client.name', e.target.value)}
              placeholder="Client name"
            />
          </div>
          <div className="invoice-form__field">
            <label htmlFor="client-email">Email</label>
            <input
              id="client-email"
              type="email"
              value={invoice.client.email}
              onChange={(e) => addField('client.email', e.target.value)}
              placeholder="client@example.com"
            />
          </div>
          <div className="invoice-form__field">
            <label htmlFor="client-taxid">Tax ID</label>
            <input
              id="client-taxid"
              value={invoice.client.taxId}
              onChange={(e) => addField('client.taxId', e.target.value)}
              placeholder="Client tax ID"
            />
          </div>
          <div className="invoice-form__field invoice-form__field--full">
            <label htmlFor="client-address">Address</label>
            <input
              id="client-address"
              value={invoice.client.address}
              onChange={(e) => addField('client.address', e.target.value)}
              placeholder="456 Client Ave, City, Country"
            />
          </div>
        </div>
      </section>

      {/* ── Line Items ──────────────────────────────────────────── */}
      <section className="invoice-form__section" aria-labelledby="items-heading">
        <div className="invoice-form__section-header">
          <h3 id="items-heading">Line Items</h3>
          <button
            type="button"
            className="button button--primary"
            onClick={() => dispatch({ type: 'ADD_ITEM' })}
          >
            + Add item
          </button>
        </div>

        <div className="invoice-form__items">
          <table className="invoice-form__items-table" aria-label="Line items">
            <thead>
              <tr>
                <th scope="col">Description</th>
                <th scope="col" className="invoice-form__items-table__qty">Qty</th>
                <th scope="col" className="invoice-form__items-table__price">Unit Price</th>
                <th scope="col" className="invoice-form__items-table__tax">Tax %</th>
                <th scope="col" className="invoice-form__items-table__total">Total</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item: typeof invoice.items[number], index: number) => {
                const lineTotal = totals.lines[index]?.gross ?? 0;
                const currency = invoice.currency;
                return (
                  <tr key={item.id}>
                    <td>
                      <input
                        value={item.description}
                        onChange={(e) => addField(`items.${index}.description`, e.target.value)}
                        placeholder="Item description"
                        aria-label={`Item ${index + 1} description`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          addField(`items.${index}.quantity`, Math.max(1, parseInt(e.target.value, 10) || 1))
                        }
                        aria-label={`Item ${index + 1} quantity`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          addField(`items.${index}.unitPrice`, parseFloat(e.target.value) || 0)
                        }
                        aria-label={`Item ${index + 1} unit price`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={item.taxRate}
                        onChange={(e) =>
                          addField(`items.${index}.taxRate`, Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))
                        }
                        aria-label={`Item ${index + 1} tax rate`}
                      />
                    </td>
                    <td className="invoice-form__items-table__total">
                      {formatMoney(lineTotal, currency)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="invoice-form__items-table__remove"
                        onClick={() => dispatch({ type: 'REMOVE_ITEM', index })}
                        aria-label={`Remove item ${index + 1}`}
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {invoice.items.length === 0 && (
            <p className="invoice-form__empty">No items. Click "+ Add item" to begin.</p>
          )}
        </div>
      </section>

      {/* ── Discount ─────────────────────────────────────────────── */}
      <section className="invoice-form__section" aria-labelledby="discount-heading">
        <h3 id="discount-heading">Discount</h3>
        <div className="invoice-form__grid">
          <div className="invoice-form__field">
            <label htmlFor="discount-type">Type</label>
            <select
              id="discount-type"
              value={invoice.discount.type}
              onChange={(e) => addField('discount.type', e.target.value)}
            >
              <option value="none">None</option>
              <option value="percent">Percentage</option>
              <option value="amount">Fixed Amount</option>
            </select>
          </div>
          <div className="invoice-form__field">
            <label htmlFor="discount-value">
              Value {invoice.discount.type === 'percent' ? '(%)' : `(in ${invoice.currency})`}
            </label>
            <input
              id="discount-value"
              type="number"
              min={0}
              step={invoice.discount.type === 'amount' ? '0.01' : '1'}
              value={invoice.discount.value}
              onChange={(e) => addField('discount.value', parseFloat(e.target.value) || 0)}
              placeholder={invoice.discount.type === 'percent' ? '10' : '0.00'}
            />
          </div>
        </div>
      </section>

      {/* ── Notes & Terms ──────────────────────────────────────── */}
      <section className="invoice-form__section" aria-labelledby="notes-heading">
        <h3 id="notes-heading">Notes &amp; Terms</h3>
        <div className="invoice-form__grid">
          <div className="invoice-form__field invoice-form__field--full">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              rows={3}
              value={invoice.notes}
              onChange={(e) => addField('notes', e.target.value)}
              maxLength={2000}
              placeholder="Payment instructions, thank you message, etc."
            />
            <span className="invoice-form__hint">{invoice.notes.length}/2000</span>
          </div>
          <div className="invoice-form__field invoice-form__field--full">
            <label htmlFor="terms">Terms &amp; Conditions</label>
            <textarea
              id="terms"
              rows={3}
              value={invoice.terms}
              onChange={(e) => addField('terms', e.target.value)}
              maxLength={5000}
              placeholder="Late payment fees, delivery terms, etc."
            />
            <span className="invoice-form__hint">{invoice.terms.length}/5000</span>
          </div>
        </div>
      </section>

      {/* ── Totals ─────────────────────────────────────────────── */}
      <div className="invoice-form__totals" aria-label="Invoice totals">
        <div className="invoice-form__total-row">
          <span>Subtotal</span>
          <span>{formatMoney(totals.subtotal, invoice.currency)}</span>
        </div>
        {totals.discount > 0 && (
          <div className="invoice-form__total-row invoice-form__total-row--discount">
            <span>Discount</span>
            <span>-{formatMoney(totals.discount, invoice.currency)}</span>
          </div>
        )}
        {totals.taxTotal > 0 && (
          <div className="invoice-form__total-row">
            <span>Tax</span>
            <span>{formatMoney(totals.taxTotal, invoice.currency)}</span>
          </div>
        )}
        <div className="invoice-form__total-row invoice-form__total-row--grand">
          <span>Grand Total</span>
          <span>{formatMoney(totals.total, invoice.currency)}</span>
        </div>
      </div>
    </div>
  );
}
