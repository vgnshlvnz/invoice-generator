/**
 * Domain types for the Invoice Generator.
 * Pure TypeScript — no React, no DOM.
 */

/** Invoice status. */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';

/** Discount type. */
export type DiscountType = 'none' | 'percent' | 'amount';

/** A single line item. */
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

/** Bank details (embedded in seller). */
export interface BankDetails {
  name: string;
  accountName: string;
  accountNumber: string;
}

/** Seller / from — matches the canonical YAML shape. */
// Note: Seller is already exported from schema.ts via z.infer.
// Keep non-exported type here only to avoid TS2308 duplicate export.
type Seller = {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  bank: BankDetails;
};

/** Client / to — matches the canonical YAML shape. */
export type Client = {
  name: string;
  email: string;
  address: string;
  taxId: string;
};

/** Discount on the invoice. */
export interface Discount {
  type: DiscountType;
  value: number;
}

/** Index entry for the invoices list. */
export interface InvoiceIndexEntry {
  id: string;
  number: string;
  client: string;
  total: number;
  status: InvoiceStatus;
  updatedAt: string; // ISO YYYY-MM-DD
}

/** Saved client entry (not an invoice — separate persistent client list). */
export interface SavedClient {
  name: string;
  email: string;
  address: string;
  taxId: string;
}

/** Seller defaults + numbering settings (stored in profile). */
export interface Profile {
  seller: Seller;
  numbering: {
    prefix: string;
    yearStart: number;
    sequenceStart: number;
  };
}
