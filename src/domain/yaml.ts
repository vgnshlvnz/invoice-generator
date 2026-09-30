import { parse, stringify, parseDocument, YAMLMap, type Document } from 'yaml';
import type { Invoice, ParseResult } from './schema';
import { validate } from './schema';

const SELLER_KEYS = ['name', 'email', 'phone', 'address', 'taxId', 'bank'] as const;
const CLIENT_KEYS = ['name', 'email', 'address', 'taxId'] as const;
const ITEM_KEYS = ['id', 'description', 'quantity', 'unitPrice', 'taxRate'] as const;
const DISCOUNT_KEYS = ['type', 'value'] as const;

/** Reorder an object's keys into the given canonical order. */
function reorder<T extends Record<string, unknown>>(
  obj: T,
  keys: readonly string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in obj && obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  for (const key of Object.keys(obj)) {
    if (!(key in result)) {
      result[key] = obj[key];
    }
  }
  return result;
}

/** Deep-reorder an invoice into the canonical YAML shape. */
function canonicalize(invoice: Invoice): Record<string, unknown> {
  return {
    schemaVersion: invoice.schemaVersion,
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    currency: invoice.currency,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    seller: reorder(invoice.seller, [...SELLER_KEYS]),
    client: reorder(invoice.client, [...CLIENT_KEYS]),
    items: invoice.items.map((item) => reorder(item, [...ITEM_KEYS])),
    discount: reorder(invoice.discount, [...DISCOUNT_KEYS]),
    notes: invoice.notes,
    terms: invoice.terms,
  };
}

/**
 * Serialize an invoice to YAML.
 *
 * - Stable key order matching the canonical shape
 * - 2-space indent
 * - Block collection style (no flow style)
 * - No line wrapping (lineWidth: 0)
 */
export function toYaml(invoice: Invoice): string {
  const ordered = canonicalize(invoice);
  const options = {
    indent: 2,
    collectionStyle: 'block' as const,
    lineWidth: 0,
    simpleKeys: false,
  };
  return stringify(ordered, options as Record<string, unknown>);
}

/**
 * Parse YAML text and validate against the invoice schema.
 *
 * Returns a discriminated union:
 *   { ok: true, invoice } | { ok: false, errors: [{ path, message, line?, col? }] }
 */
export function fromYaml(text: string): ParseResult {
  try {
    const parsed = parse(text) as Record<string, unknown> | null;
    if (parsed === null || typeof parsed !== 'object') {
      return { ok: false, errors: [{ path: '(document)', message: 'Expected a YAML mapping' }] };
    }

    const result = validate(parsed);
    if (result.ok) {
      return result;
    }

    // Enrich errors with line/column from the YAML document
    const doc = parseDocument(text);
    const enriched = result.errors.map((err) => enrichWithPosition(doc, err));
    return { ok: false, errors: enriched };
  } catch (e) {
    // YAML parse error
    if (e instanceof Error && 'line' in e) {
      const err = e as Error & { line?: number; col?: number };
      return {
        ok: false,
        errors: [{
          path: '(document)',
          message: e.message,
          line: typeof err.line === 'number' ? err.line + 1 : undefined,
          col: typeof err.col === 'number' ? err.col + 1 : undefined,
        }],
      };
    }
    return { ok: false, errors: [{ path: '(document)', message: String(e) }] };
  }
}

/** Walk a YAML Document's nested structure to find the node at a given dot-separated path. */
function walkPath(doc: Document | null, path: string): { line?: number; col?: number } {
  if (!doc) return {};
  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) return {};

  let node: unknown = doc.contents;
  for (let i = 0; i < parts.length; i++) {
    if (!(node instanceof YAMLMap)) return {};
    const key = parts[i];
    const pair = node.items.find((p) => p.key.value === key);
    if (!pair) return {};
    // Return the line/col of the value node
    if (pair.value && 'range' in pair.value && Array.isArray((pair.value as { range?: unknown }).range)) {
      const range = (pair.value as { range: [number, number, number] }).range;
      return { line: range[0] + 1, col: range[1] + 1 };
    }
    node = pair.value;
  }

  return {};
}

/** Try to attach line/column info to a schema validation error. */
function enrichWithPosition(
  doc: Document | null,
  err: { path: string; message: string },
): { path: string; message: string; line?: number; col?: number } {
  if (!err.path || err.path === '(document)') return err;
  const pos = walkPath(doc, err.path);
  return { ...err, ...pos };
}

/**
 * Migrate a YAML document to the current schema version.
 *
 * Currently only v1 exists; structured so v2 is easy to add.
 * @param doc — parsed object from YAML
 * @returns the document at the target version
 */
export function migrate(doc: unknown): unknown {
  if (typeof doc !== 'object' || doc === null) return doc;

  const version = (doc as Record<string, unknown>).schemaVersion;

  switch (version) {
    case 1:
      // v1 passes through unchanged
      return doc;
    // case 2: — future migrations go here
    default:
      // Unknown version — return as-is and let validation catch it
      return doc;
  }
}
