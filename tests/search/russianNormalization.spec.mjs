import { describe, it, expect } from 'vitest';
import { normalizeRussianQuery, getTestCases } from '../../src/search/russianNormalization.mjs';

describe('Russian normalization', () => {
  it('transliterates Cyrillic and preserves ASCII', () => {
    const r1 = normalizeRussianQuery('транзистор');
    expect(r1.success).toBe(true);
    expect(r1.hasCyrillic).toBe(true);
    expect(r1.transliterated).toContain('tranzistor');

    const r2 = normalizeRussianQuery('2N3904 транзистор');
    expect(r2.success).toBe(true);
    expect(r2.mpns).toContain('2N3904');
  });

  it('extracts MPNs from mixed queries', () => {
    const r = normalizeRussianQuery('конденсатор 1000мкф 25в NE555');
    expect(r.success).toBe(true);
    expect(r.mpns).toContain('NE555');
  });

  it('smoke preset cases', () => {
    const cases = getTestCases();
    // at least NE555 and 2N3904 are recognized
    const flat = cases.flatMap(c => c.mpns);
    expect(flat).toEqual(expect.arrayContaining(['NE555', '2N3904']));
  });
});
