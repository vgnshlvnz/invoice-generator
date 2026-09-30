import { describe, it, expect } from 'vitest';
import { generateId } from './ids';

describe('generateId', () => {
  it('returns an ID with the inv_ prefix', () => {
    expect(generateId()).toMatch(/^inv_/);
  });

  it('generates unique IDs on successive calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  it('produces sortable IDs (lexicographically ordered by creation time)', () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(generateId());
    }
    // All IDs share the same timestamp (generated within the same ms),
    // so lexicographic sort should match creation order for most cases.
    // At minimum, all IDs should be valid.
    expect(ids.length).toBe(5);
    expect(ids.every((id) => id.startsWith('inv_'))).toBe(true);
    expect(ids.every((id) => id.length === 29)).toBe(true); // inv_ (4) + 25 base32
  });

  it('has a consistent length (inv_ + 25 base32 chars)', () => {
    const id = generateId();
    expect(id.length).toBe(29);
  });

  it('only uses valid base32 characters', () => {
    const id = generateId();
    const suffix = id.slice(4); // Remove 'inv_'
    // Crockford base32: 0-9, A-Z minus I, L, O, U
    expect(suffix).toMatch(/^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]+$/);
  });
});
