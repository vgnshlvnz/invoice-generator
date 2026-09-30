/**
 * Sortable unique ID generation.
 *
 * Format: `inv_` + 25 base32 characters.
 * - First 10 base32 chars = 48-bit millisecond timestamp ( sortable!)
 * - Remaining 15 chars = 75 bits of crypto random data
 *
 * No external dependencies — uses `crypto.getRandomValues`.
 */

const BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32
const BASE = BigInt(BASE32.length);

/** Encode a bigint to a fixed-length base32 string. */
function encodeBase32Fixed(value: bigint, length: number): string {
  const out: string[] = new Array(length);
  for (let i = length - 1; i >= 0; i--) {
    out[i] = BASE32[Number(value % BASE)];
    value = value / BASE;
  }
  return out.join('');
}

/**
 * Generate a sortable unique ID.
 *
 * The timestamp portion ensures IDs are lexicographically sortable by creation time.
 */
export function generateId(): string {
  // 48-bit timestamp (milliseconds since epoch, masked to fit)
  const ts = BigInt(Date.now()) & 0xFFFFFFFFFFFFn;
  const tsEncoded = encodeBase32Fixed(ts, 10);

  // 75 bits of randomness (from 10 bytes, we use 75 bits)
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);

  let rand = 0n;
  for (let i = 0; i < 10; i++) {
    rand = (rand << 8n) | BigInt(bytes[i]);
  }
  // Mask to 75 bits
  rand = rand & ((1n << 75n) - 1n);

  return `inv_${tsEncoded}${encodeBase32Fixed(rand, 15)}`;
}
