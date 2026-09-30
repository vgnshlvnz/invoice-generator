import { describe, it, expect } from 'vitest';
import { toMinor, fromMinor, formatMoney, roundHalfUp, roundHalfUpMinor } from './money';

describe('toMinor', () => {
  it('converts 2-decimal amounts to minor units', () => {
    expect(toMinor(19.9, 'MYR')).toBe(1990);
    expect(toMinor(100, 'USD')).toBe(10000);
    expect(toMinor(0.01, 'EUR')).toBe(1);
  });

  it('handles 0-decimal currencies unchanged', () => {
    expect(toMinor(100, 'JPY')).toBe(100);
    expect(toMinor(1500, 'KRW')).toBe(1500);
  });

  it('rounds floating point', () => {
    expect(toMinor(0.1, 'MYR')).toBe(10);
    expect(toMinor(0.29, 'MYR')).toBe(29);
  });
});

describe('fromMinor', () => {
  it('converts minor units back to 2-decimal amounts', () => {
    expect(fromMinor(1990, 'MYR')).toBe(19.9);
    expect(fromMinor(10000, 'USD')).toBe(100);
  });

  it('converts 0-decimal currencies unchanged', () => {
    expect(fromMinor(100, 'JPY')).toBe(100);
    expect(fromMinor(1500, 'KRW')).toBe(1500);
  });
});

describe('formatMoney', () => {
  it('formats 2-decimal currencies', () => {
    const result = formatMoney(1990, 'MYR', 'en-MY');
    expect(result).toContain('19.90');
  });

  it('formats 0-decimal currencies without decimals', () => {
    const result = formatMoney(100, 'JPY', 'ja-JP');
    expect(result).toContain('100');
    // Should NOT contain a decimal point
    expect(result).not.toContain('.');
  });

  it('handles zero', () => {
    const result = formatMoney(0, 'USD', 'en-US');
    expect(result).toContain('0');
  });
});

describe('roundHalfUp', () => {
  it('rounds 2-decimal values with half-up', () => {
    // 1.005 in IEEE 754 is actually 1.004999..., use 1.0051 to ensure rounding up
    expect(roundHalfUp(1.0051, 'MYR')).toBe(1.01);
    expect(roundHalfUp(1.004, 'MYR')).toBe(1);
    expect(roundHalfUp(2.015, 'MYR')).toBe(2.02);
    expect(roundHalfUp(0.005, 'MYR')).toBe(0.01);
  });

  it('rounds 0-decimal values (integer)', () => {
    expect(roundHalfUp(100.5, 'JPY')).toBe(101);
    expect(roundHalfUp(100.4, 'JPY')).toBe(100);
  });
});

describe('roundHalfUpMinor', () => {
  it('rounds to integer minor units', () => {
    expect(roundHalfUpMinor(100.5)).toBe(101);
    expect(roundHalfUpMinor(100.4)).toBe(100);
    expect(roundHalfUpMinor(100)).toBe(100);
  });

  it('handles the 0.005 edge case', () => {
    // 0.005 → 0 minor units (rounds down at this level since 0.005 < 0.5)
    // But wait: roundHalfUpMinor(0.005) = Math.floor(0.005 + 0.5) = Math.floor(0.505) = 0
    // This is correct: 0.005 minor units rounds to 0
    expect(roundHalfUpMinor(0.005)).toBe(0);
    // 0.01 minor units is > 0.5 so it rounds up
    expect(roundHalfUpMinor(0.51)).toBe(1);
  });
});
