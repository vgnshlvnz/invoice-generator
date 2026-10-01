/**
 * Preview — read-only, print-ready rendering of the current invoice.
 *
 * All figures come from computeTotals (integer minor units, half-up per
 * line), so the preview always matches the form's totals bar.
 */
import { useInvoice } from '../../state/store';
import { computeTotals, formatMoney, toMinor } from '../../domain';
import { Button } from '../../ui';
import './Preview.css';

/** Sum line taxes per rate, preserving first-seen order. */
export function taxByRate(rates: number[], lineTaxes: number[]): { rate: number; tax: number }[] {
  const groups = new Map<number, number>();
  rates.forEach((rate, i) => {
    if (rate > 0) groups.set(rate, (groups.get(rate) ?? 0) + (lineTaxes[i] ?? 0));
  });
  return [...groups].map(([rate, tax]) => ({ rate, tax }));
}

function Lines({ values }: { values: (string | undefined)[] }) {
  return (
    <>
      {values.filter(Boolean).map((v, i) => (
        <div key={i} className="inv-pre">{v}</div>
      ))}
    </>
  );
}

export function Preview() {
  const { invoice: inv } = useInvoice();
  const totals = computeTotals(inv);
  const money = (minor: number) => formatMoney(minor, inv.currency);
  const taxGroups = taxByRate(inv.items.map((it) => it.taxRate), totals.lines.map((l) => l.tax));
  const { seller, client } = inv;
  const bank = seller.bank;

  return (
    <div className="preview-pane">
      <div className="preview-pane__toolbar">
        <Button size="sm" onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>

      <div className="preview-pane__canvas">
        <article className="inv-paper" id="invoice-print-area" aria-label={`Invoice ${inv.number || 'preview'}`}>
          {(inv.status === 'paid' || inv.status === 'void') && (
            <div className="inv-watermark" aria-hidden="true">{inv.status.toUpperCase()}</div>
          )}

          <header className="inv-header">
            <div>
              <h2 className="inv-title">INVOICE</h2>
              <div className="inv-seller-name">{seller.name || 'Your business'}</div>
              <Lines values={[seller.address, seller.email, seller.phone, seller.taxId && `Tax ID: ${seller.taxId}`]} />
            </div>
            <dl className="inv-meta">
              <dt>Invoice no.</dt><dd>{inv.number || '—'}</dd>
              <dt>Issue date</dt><dd>{inv.issueDate || '—'}</dd>
              <dt>Due date</dt><dd>{inv.dueDate || '—'}</dd>
              <dt>Status</dt><dd className="inv-status">{inv.status}</dd>
            </dl>
          </header>

          <section className="inv-section">
            <h3 className="inv-section-title">Bill to</h3>
            <div className="inv-seller-name">{client.name || '—'}</div>
            <Lines values={[client.address, client.email, client.taxId && `Tax ID: ${client.taxId}`]} />
          </section>

          <table className="inv-items">
            <thead>
              <tr>
                <th scope="col">Description</th>
                <th scope="col" className="num">Qty</th>
                <th scope="col" className="num">Unit price</th>
                <th scope="col" className="num">Tax</th>
                <th scope="col" className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.length === 0 && (
                <tr><td colSpan={5} className="inv-empty">No line items</td></tr>
              )}
              {inv.items.map((item, i) => (
                <tr key={item.id ?? i}>
                  <td className="inv-pre">{item.description || '—'}</td>
                  <td className="num">{item.quantity}</td>
                  <td className="num">{money(toMinor(item.unitPrice, inv.currency))}</td>
                  <td className="num">{item.taxRate}%</td>
                  <td className="num">{money(totals.lines[i]?.net ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="inv-totals">
            <div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
            {totals.discount > 0 && (
              <div>
                <dt>Discount{inv.discount.type === 'percent' ? ` (${inv.discount.value}%)` : ''}</dt>
                <dd>−{money(totals.discount)}</dd>
              </div>
            )}
            {taxGroups.map((g) => (
              <div key={g.rate}><dt>Tax {g.rate}%</dt><dd>{money(g.tax)}</dd></div>
            ))}
            <div className="inv-totals__grand"><dt>Total due</dt><dd>{money(totals.total)}</dd></div>
          </dl>

          {(bank.name || bank.accountNumber) && (
            <section className="inv-section">
              <h3 className="inv-section-title">Payment details</h3>
              <Lines
                values={[
                  bank.name && `Bank: ${bank.name}`,
                  bank.accountName && `Account name: ${bank.accountName}`,
                  bank.accountNumber && `Account no.: ${bank.accountNumber}`,
                ]}
              />
            </section>
          )}

          {inv.notes && (
            <section className="inv-section">
              <h3 className="inv-section-title">Notes</h3>
              <div className="inv-pre">{inv.notes}</div>
            </section>
          )}
          {inv.terms && (
            <section className="inv-section">
              <h3 className="inv-section-title">Terms</h3>
              <div className="inv-pre">{inv.terms}</div>
            </section>
          )}
        </article>
      </div>
    </div>
  );
}
