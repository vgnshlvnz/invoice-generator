# Invoice Generator

A browser-only invoice generator. Fill in a friendly form, get a YAML document. Persisted in localStorage. No backend, no accounts, works offline.

## Run / Build

```bash
npm install
npm run dev       # Start development server
npm run build     # Production build
npm run preview   # Preview production build
```

## Architecture

```
src/
  domain/         Pure TypeScript: schema, types, money math, numbering, YAML
  storage/        localStorage repository (only folder that touches localStorage)
  state/          App store: React context + reducer
  features/       Feature UI: invoice-form, invoices, settings
  ui/             Shared primitives: Button, Field, Dialog, Drawer, Toast, etc.
  App.tsx         App shell with keyboard shortcuts and error boundary
  main.tsx        Entry point with provider
```

### Key rules

- **Money** in YAML = decimal numbers. All math uses integer minor units (cents/sen). Round half-up per line, then sum.
- **Dates** = ISO `YYYY-MM-DD` strings.
- **Every input** has a label, is keyboard-reachable, has visible focus, and uses `aria-live` for errors.

## YAML Schema

Canonical YAML shape (`schemaVersion: 1`):

```yaml
schemaVersion: 1
id: inv_01J...            # ULID-like, sortable unique ID
number: INV-2026-0001     # Auto-generated or manual
status: draft             # draft | sent | paid | void
currency: MYR             # ISO 4217 currency code
issueDate: 2026-10-01
dueDate: 2026-10-15
seller:
  name: "Your Business"
  email: "you@business.com"
  phone: "+60123456789"
  address: "123 Business St, City"
  taxId: "123456789012"
  bank:
    name: "Maybank"
    accountName: "Business Account"
    accountNumber: "1234567890"
client:
  name: "Client Corp"
  email: "billing@client.com"
  address: "456 Client Ave, City"
  taxId: "987654321098"
items:
  - description: "Web development"
    quantity: 1
    unitPrice: 5000.00
    taxRate: 6            # percentage, 0-100
discount:
  type: none              # none | percent | amount
  value: 0
notes: "Thank you for your business."
terms: "Payment due within 30 days."
```

> **Computed totals are never stored in YAML.** Subtotal, discount, tax, and grand total are derived at render time from the items.

## Storage

All data is stored in `localStorage` with the prefix `invoicegen:v1:`:

| Key | Format | Description |
|---|---|---|
| `invoicegen:v1:index` | JSON array | Index of all invoices: `{id, number, client, total, status, updatedAt}` |
| `invoicegen:v1:invoice:<id>` | YAML string | Full invoice YAML |
| `invoicegen:v1:profile` | JSON object | Seller defaults + numbering settings |
| `invoicegen:v1:clients` | JSON array | Saved client entries |

## Backup / Restore

### Export (Backup)

Click **Export all as YAML** to download a single YAML file containing all invoices, your profile, and saved clients. This file can be used to restore data in a new browser or device.

### Import (Restore)

Drag and drop one or more YAML files onto the import zone. The app validates each file:
- Valid invoices are saved to `localStorage`
- Invalid files are skipped with an error message
- Duplicate IDs (by invoice `id` field) are skipped

### Re-import after clearing data

If you've cleared your data, import the backup YAML file to restore everything.

## Adding a schemaVersion 2

To add a new schema version:

1. Create `src/domain/schemaV2.ts` with new Zod schemas.
2. Update `src/domain/yaml.ts` → `migrate()` to handle `case 2:`.
3. The migration function receives a `schemaVersion: 1` document and returns a `schemaVersion: 2` document.
4. Update `createEmptyInvoice()` in `factory.ts` to default to the new version.
5. Add migration tests in `src/domain/migration.test.ts`.

Example migration:

```typescript
// In src/domain/yaml.ts
case 2:
  const v1 = doc as Record<string, unknown>;
  return {
    ...v1,
    schemaVersion: 2,
    // Add new fields with defaults
    newField: '',
  };
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl` + `S` | Save invoice now (bypasses autosave) |
| `Ctrl` + `P` | Print invoice |
| `Ctrl` + `K` | Toggle invoice list |
| `Ctrl` + `Enter` | Add line item |
| `?` | Show keyboard shortcuts help |

## Testing

```bash
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
npm test             # Vitest unit tests
npm run test:e2e     # Playwright e2e tests
```

## Accessibility

- All inputs have associated `<label>` elements.
- Dialogs and drawers trap focus and return focus on close.
- `aria-live` regions announce save status and errors.
- `role="dialog"` and `aria-modal="true"` on all overlays.
- WCAG AA color contrast in both light and dark themes.
- Full keyboard navigation — no mouse required.
