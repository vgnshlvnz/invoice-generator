import { z } from 'zod';

/**
 * Zod schemas for the canonical YAML shape (schemaVersion 1).
 *
 * All constraints match the project brief and AGENTS.md spec.
 */

/** ISO 4217 currency code (3 uppercase ASCII letters). */
const CURRENCY_RE = /^[A-Z]{3}$/;

export const BankDetailsSchema = z.object({
  name: z.string().max(200),
  accountName: z.string().max(200),
  accountNumber: z.string().max(100),
});

export const SellerSchema = z.object({
  name: z.string().max(200),
  email: z.string().max(200).refine(
    (val) => val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    { message: 'Invalid email' },
  ),
  phone: z.string().max(50),
  address: z.string().max(1000),
  taxId: z.string().max(50),
  bank: BankDetailsSchema,
});

/** Inferred Seller type. */
export type Seller = z.infer<typeof SellerSchema>;

export const ClientSchema = z.object({
  name: z.string().max(200),
  email: z.string().max(200).refine(
    (val) => val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    { message: 'Invalid email' },
  ),
  address: z.string().max(1000),
  taxId: z.string().max(50),
});

export const ItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().max(500),
  quantity: z.number().int().positive(),       // > 0
  unitPrice: z.number().min(0),               // >= 0
  taxRate: z.number().min(0).max(100),        // 0-100%
});

export const DiscountSchema = z.object({
  type: z.enum(['none', 'percent', 'amount']),
  value: z.number().min(0),
});

/** Full invoice schema with date refinement. */
export const InvoiceSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  number: z.string(),
  status: z.enum(['draft', 'sent', 'paid', 'void']),
  currency: z.string().regex(CURRENCY_RE, 'Must be a 3-letter ISO 4217 currency code'),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seller: SellerSchema,
  client: ClientSchema,
  items: z.array(ItemSchema).min(1),
  discount: DiscountSchema,
  notes: z.string().max(2000),
  terms: z.string().max(5000),
}).refine(
  (data) => data.dueDate >= data.issueDate,
  { message: 'dueDate must be on or after issueDate', path: ['dueDate'] },
);

/** Inferred Invoice type from the Zod schema. */
export type Invoice = z.infer<typeof InvoiceSchema>;

/** Result of parsing + validating a YAML invoice. */
export type ParseResult =
  | { ok: true; invoice: Invoice }
  | { ok: false; errors: { path: string; message: string; line?: number; col?: number }[] };

/** Validate raw input and return a discriminated union. */
export function validate(input: unknown): ParseResult {
  const result = InvoiceSchema.safeParse(input);
  if (result.success) {
    return { ok: true, invoice: result.data };
  }
  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join('.') || issue.code,
    message: issue.message,
  }));
  return { ok: false, errors };
}
