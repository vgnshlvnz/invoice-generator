import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock localStorage for jsdom test environment
const mockStorage: Record<string, string> = {};
const storageMock = {
  getItem: (key: string) => key in mockStorage ? mockStorage[key] ?? null : null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
};

vi.stubGlobal('localStorage', storageMock);
