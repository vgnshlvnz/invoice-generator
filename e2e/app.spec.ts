/**
 * e2e tests — Invoice Generator
 *
 * Each test gets a fresh browser context, so localStorage starts empty.
 *
 * Coverage:
 * 1. Onboarding → seller defaults appear in the form
 * 2. Form edits → YAML and preview update (money math end to end)
 * 3. YAML edit with an error → fix → form updates
 * 4. Import a YAML file → appears in the invoice list
 * 5. Data persists on reload
 * 6. Save via Ctrl/Cmd+S
 * 7. Add line item via Ctrl/Cmd+Enter
 * 8. Help dialog via ?
 * 9. Print shows only the invoice
 * 10. Marking another invoice as paid leaves the open one alone
 */
import { test, expect, type Page } from '@playwright/test';

/** Mark onboarding as done before the app boots. */
async function skipOnboarding(page: Page) {
  await page.addInitScript(() => localStorage.setItem('invoicegen:onboarding:done', 'true'));
}

async function openApp(page: Page) {
  await skipOnboarding(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Invoice Generator' })).toBeVisible();
}

const yamlEditor = (page: Page) => page.getByLabel('Invoice YAML');
const saveStatus = (page: Page) => page.getByRole('status').filter({ hasText: /saved|unsaved|failed/i });

test('onboarding → seller defaults appear in the form', async ({ page }) => {
  await page.goto('/');

  const welcome = page.getByRole('dialog', { name: 'Welcome to Invoice Generator' });
  await expect(welcome).toBeVisible();

  const next = welcome.getByRole('button', { name: 'Next' });
  await expect(next).toBeDisabled();
  await welcome.getByLabel('Name *').fill('Test Business');
  await welcome.getByLabel('Email *').fill('test@business.com');
  await expect(next).toBeEnabled();
  await next.click();
  await next.click();

  await expect(welcome.getByRole('heading', { name: "You're all set!" })).toBeVisible();
  await welcome.getByRole('button', { name: 'Done' }).click();
  await expect(welcome).toBeHidden();

  await expect(page.locator('#seller-name')).toHaveValue('Test Business');

  // Onboarding does not come back after a reload.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Invoice Generator' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Welcome to Invoice Generator' })).toHaveCount(0);
});

test('form edits update YAML and preview totals', async ({ page }) => {
  await openApp(page);

  await page.locator('#client-name').fill('Acme Corp');
  await page.getByLabel('Item 1 description').fill('Web Design');
  await page.getByLabel('Item 1 quantity').fill('2');
  await page.getByLabel('Item 1 unit price').fill('1500');
  await page.getByLabel('Item 1 tax rate').fill('8');

  // Preview: 2 × 1500 = 3000.00 net, 8% tax = 240.00, total 3240.00
  const paper = page.getByRole('article');
  await expect(paper.getByText('Acme Corp')).toBeVisible();
  await expect(paper.locator('.inv-totals__grand')).toContainText('3,240.00');
  await expect(paper.getByText('Tax 8%')).toBeVisible();

  await page.getByRole('tab', { name: 'YAML' }).click();
  await expect(yamlEditor(page)).toHaveValue(/name: Acme Corp/);
  await expect(yamlEditor(page)).toHaveValue(/description: Web Design/);
  await expect(yamlEditor(page)).toHaveValue(/unitPrice: 1500/);
});

test('YAML edit error → fix updates form', async ({ page }) => {
  await openApp(page);
  await page.getByRole('tab', { name: 'YAML' }).click();

  const original = await yamlEditor(page).inputValue();

  await yamlEditor(page).fill(original.replace(/^currency: .*$/m, 'currency: [broken'));
  await expect(page.getByText(/YAML is invalid/)).toBeVisible();
  await expect(yamlEditor(page)).toHaveAttribute('aria-invalid', 'true');

  await yamlEditor(page).fill(original.replace(/^notes: .*$/m, 'notes: Fixed via YAML'));
  await expect(page.getByText(/YAML is invalid/)).toBeHidden();
  await expect(page.locator('#notes')).toHaveValue('Fixed via YAML');
});

test('import YAML file appears in the invoice list', async ({ page }) => {
  await openApp(page);

  const yamlContent = `schemaVersion: 1
id: inv_e2e_test_001
number: INV-E2E-0001
status: draft
currency: MYR
issueDate: 2026-10-01
dueDate: 2026-10-15
seller:
  name: Test Seller
  email: seller@test.com
  phone: ""
  address: ""
  taxId: ""
  bank:
    name: ""
    accountName: ""
    accountNumber: ""
client:
  name: Imported Client
  email: client@test.com
  address: ""
  taxId: ""
items:
  - id: item_1
    description: Imported item
    quantity: 1
    unitPrice: 100
    taxRate: 0
discount:
  type: none
  value: 0
notes: ""
terms: ""
`;

  await page.getByRole('button', { name: 'Toggle invoice list' }).click();
  const drawer = page.getByRole('dialog', { name: 'Invoices' });
  await expect(drawer).toBeVisible();

  await drawer.locator('input[type="file"]').setInputFiles({
    name: 'imported.yaml',
    mimeType: 'text/yaml',
    buffer: Buffer.from(yamlContent),
  });

  await expect(page.getByRole('dialog', { name: 'Import results' })).toContainText('Imported');
  await expect(drawer.getByRole('table', { name: 'Invoice list' })).toContainText('INV-E2E-0001');
  await expect(drawer.getByRole('table', { name: 'Invoice list' })).toContainText('Imported Client');
});

test('data persists on reload', async ({ page }) => {
  await openApp(page);

  await page.locator('#client-name').fill('Persistent Client');
  await expect(saveStatus(page)).toHaveText('All changes saved');

  await page.reload();
  await expect(page.locator('#client-name')).toHaveValue('Persistent Client');
  await expect(page.getByRole('button', { name: 'Toggle invoice list' })).toContainText('(1)');
});

test('save via Ctrl/Cmd+S', async ({ page }) => {
  await openApp(page);

  await page.locator('#client-name').fill('Shortcut Client');
  await expect(saveStatus(page)).toHaveText('Unsaved changes');
  await page.keyboard.press('ControlOrMeta+s');
  await expect(saveStatus(page)).toHaveText('All changes saved');

  const stored = await page.evaluate(() => localStorage.getItem('invoicegen:v1:index'));
  expect(stored).toContain('Shortcut Client');
});

test('add line item via Ctrl/Cmd+Enter', async ({ page }) => {
  await openApp(page);

  const rows = page.getByRole('table', { name: 'Line items' }).locator('tbody tr');
  const before = await rows.count();

  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(rows).toHaveCount(before + 1);
});

test('help dialog via ?', async ({ page }) => {
  await openApp(page);

  await page.locator('body').click();
  await page.keyboard.press('?');

  const help = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
  await expect(help).toBeVisible();
  for (const label of ['Save invoice', 'Print invoice', 'Toggle invoice list', 'Add line item', 'Show this help']) {
    await expect(help.getByText(label)).toBeVisible();
  }

  await page.keyboard.press('Escape');
  await expect(help).toBeHidden();
});

test('print shows only the invoice', async ({ page }) => {
  await openApp(page);
  await page.locator('#client-name').fill('Print Client');

  // Even with the YAML tab active, print output is the invoice paper.
  await page.getByRole('tab', { name: 'YAML' }).click();
  await page.emulateMedia({ media: 'print' });

  await expect(page.locator('.app-header')).toBeHidden();
  await expect(page.locator('#client-name')).toBeHidden();
  await expect(page.getByRole('tablist')).toBeHidden();
  await expect(yamlEditor(page)).toBeHidden();
  await expect(page.locator('#invoice-print-area')).toBeVisible();
  await expect(page.locator('#invoice-print-area')).toContainText('Print Client');
  await expect(page.getByRole('button', { name: /print/i })).toBeHidden();
});

test('marking another invoice as paid leaves the open invoice alone', async ({ page }) => {
  await openApp(page);

  // Invoice A
  await page.locator('#client-name').fill('Client A');
  await expect(saveStatus(page)).toHaveText('All changes saved');
  const numberA = await page.locator('#inv-number').inputValue();

  // Invoice B
  await page.getByRole('button', { name: 'Toggle invoice list' }).click();
  const drawer = page.getByRole('dialog', { name: 'Invoices' });
  await drawer.getByRole('button', { name: '+ New invoice' }).click();
  await page.locator('#client-name').fill('Client B');
  await expect(saveStatus(page)).toHaveText('All changes saved');

  await page.getByRole('button', { name: 'Toggle invoice list' }).click();
  await drawer.getByRole('button', { name: `Mark ${numberA} as paid` }).click();

  const rowA = drawer.getByRole('row').filter({ hasText: 'Client A' });
  const rowB = drawer.getByRole('row').filter({ hasText: 'Client B' });
  await expect(rowA).toContainText(/paid/i);
  await expect(rowB).toContainText(/draft/i);
  await expect(page.locator('#inv-status')).toHaveValue('draft');
});
