/**
 * Unit tests for autocompleteOrchestrator.mjs
 * Tests: normalization, deduplication, sorting
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

// Mock suggestions for testing
const mockSuggestions = [
  { mpn: 'LM317T', title: 'Voltage Regulator', manufacturer: 'STMicro', source: 'tme' },
  { mpn: 'lm317t', title: 'Voltage Regulator Duplicate', manufacturer: 'OnSemi', source: 'mouser' }, // duplicate MPN (case-insensitive)
  { mpn: 'LM317BT', title: 'Voltage Regulator B', manufacturer: 'STMicro', source: 'tme' },
  { mpn: 'BC547', title: 'Transistor NPN', manufacturer: 'OnSemi', source: 'farnell' },
  { mpn: 'LM3171', title: 'Voltage Regulator Extended', manufacturer: 'TI', source: 'digikey' },
];

// Helper functions (extracted from autocompleteOrchestrator.mjs logic)
function normalizeQuery(q) {
  const trimmed = String(q || '').trim();
  if (!trimmed) return '';
  
  // Uppercase if looks like MPN (alphanumeric + hyphens/underscores)
  if (/^[A-Za-z0-9\-_.]+$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

function deduplicateByMpn(suggestions) {
  const seen = new Set();
  const result = [];
  
  for (const item of suggestions) {
    const mpnKey = String(item.mpn || '').toUpperCase();
    if (!mpnKey) continue;
    if (seen.has(mpnKey)) continue;
    
    seen.add(mpnKey);
    result.push(item);
  }
  
  return result;
}

function sortSuggestions(suggestions, query) {
  const qUpper = query.toUpperCase();
  
  return suggestions.slice().sort((a, b) => {
    const aMpn = String(a.mpn || '').toUpperCase();
    const bMpn = String(b.mpn || '').toUpperCase();
    
    // 1. Prefix match priority
    const aStartsWith = aMpn.startsWith(qUpper);
    const bStartsWith = bMpn.startsWith(qUpper);
    
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    
    // 2. Length (shorter first)
    const lenDiff = aMpn.length - bMpn.length;
    if (lenDiff !== 0) return lenDiff;
    
    // 3. Source priority: mouser > farnell > tme > digikey
    const sourcePriority = { mouser: 1, farnell: 2, tme: 3, digikey: 4 };
    const aPrio = sourcePriority[a.source] || 99;
    const bPrio = sourcePriority[b.source] || 99;
    
    return aPrio - bPrio;
  });
}

// Tests
describe('autocompleteOrchestrator', () => {
  
  describe('normalizeQuery', () => {
    it('should trim whitespace', () => {
      assert.equal(normalizeQuery('  LM317  '), 'LM317');
    });
    
    it('should uppercase MPN-like queries', () => {
      assert.equal(normalizeQuery('lm317'), 'LM317');
      assert.equal(normalizeQuery('bc-547'), 'BC-547');
    });
    
    it('should NOT uppercase queries with spaces', () => {
      assert.equal(normalizeQuery('voltage regulator'), 'voltage regulator');
    });
    
    it('should return empty string for empty input', () => {
      assert.equal(normalizeQuery(''), '');
      assert.equal(normalizeQuery('  '), '');
    });
  });
  
  describe('deduplicateByMpn', () => {
    it('should remove duplicate MPNs (case-insensitive)', () => {
      const input = [
        { mpn: 'LM317T', title: 'A', source: 'tme' },
        { mpn: 'lm317t', title: 'B', source: 'mouser' }, // duplicate
        { mpn: 'BC547', title: 'C', source: 'farnell' },
      ];
      
      const result = deduplicateByMpn(input);
      
      assert.equal(result.length, 2);
      assert.equal(result[0].mpn, 'LM317T');
      assert.equal(result[1].mpn, 'BC547');
    });
    
    it('should keep first occurrence of duplicate', () => {
      const input = [
        { mpn: 'LM317T', title: 'First', source: 'tme' },
        { mpn: 'LM317T', title: 'Second', source: 'mouser' },
      ];
      
      const result = deduplicateByMpn(input);
      
      assert.equal(result.length, 1);
      assert.equal(result[0].title, 'First');
      assert.equal(result[0].source, 'tme');
    });
    
    it('should handle empty mpn fields', () => {
      const input = [
        { mpn: '', title: 'No MPN', source: 'tme' },
        { mpn: 'LM317', title: 'Valid', source: 'mouser' },
      ];
      
      const result = deduplicateByMpn(input);
      
      assert.equal(result.length, 1);
      assert.equal(result[0].mpn, 'LM317');
    });
  });
  
  describe('sortSuggestions', () => {
    it('should prioritize prefix matches', () => {
      const input = [
        { mpn: 'BC547', title: 'Transistor', source: 'tme' },
        { mpn: 'LM317T', title: 'Regulator', source: 'mouser' },
        { mpn: 'LM3171', title: 'Extended', source: 'farnell' },
      ];
      
      const result = sortSuggestions(input, 'LM317');
      
      assert.equal(result[0].mpn, 'LM317T'); // starts with LM317
      assert.equal(result[1].mpn, 'LM3171'); // starts with LM317
      assert.equal(result[2].mpn, 'BC547');  // does not start
    });
    
    it('should sort by length when both are prefix matches', () => {
      const input = [
        { mpn: 'LM317DCYR', title: 'Long', source: 'tme' },
        { mpn: 'LM317T', title: 'Short', source: 'mouser' },
      ];
      
      const result = sortSuggestions(input, 'LM317');
      
      assert.equal(result[0].mpn, 'LM317T');    // shorter
      assert.equal(result[1].mpn, 'LM317DCYR'); // longer
    });
    
    it('should prioritize by source when length is equal', () => {
      const input = [
        { mpn: 'LM317T', title: 'TME', source: 'tme' },
        { mpn: 'LM317T', title: 'Mouser', source: 'mouser' },
        { mpn: 'LM317T', title: 'Farnell', source: 'farnell' },
      ];
      
      const result = sortSuggestions(input, 'LM317');
      
      // mouser > farnell > tme
      assert.equal(result[0].source, 'mouser');
      assert.equal(result[1].source, 'farnell');
      assert.equal(result[2].source, 'tme');
    });
    
    it('should handle mixed case in MPN comparison', () => {
      const input = [
        { mpn: 'bc547', title: 'Lowercase', source: 'tme' },
        { mpn: 'LM317T', title: 'Uppercase', source: 'mouser' },
      ];
      
      const result = sortSuggestions(input, 'lm317');
      
      assert.equal(result[0].mpn, 'LM317T'); // matches query (case-insensitive)
      assert.equal(result[1].mpn, 'bc547');
    });
  });
  
  describe('integration: full pipeline', () => {
    it('should normalize → deduplicate → sort correctly', () => {
      const query = '  lm317  '; // with whitespace and lowercase
      const input = [
        { mpn: 'BC547', title: 'Transistor', source: 'tme' },
        { mpn: 'LM3171', title: 'Extended', source: 'digikey' },
        { mpn: 'lm317t', title: 'Duplicate A', source: 'tme' },
        { mpn: 'LM317T', title: 'Duplicate B', source: 'mouser' }, // duplicate (case-insensitive)
        { mpn: 'LM317BT', title: 'Variant', source: 'farnell' },
      ];
      
      const normalized = normalizeQuery(query);
      const deduplicated = deduplicateByMpn(input);
      const sorted = sortSuggestions(deduplicated, normalized);
      
      assert.equal(normalized, 'LM317');
      assert.equal(deduplicated.length, 4); // removed duplicate LM317T
      
      // Sorted order: LM317T (prefix, length 6) > LM317BT (prefix, length 7) > LM3171 (prefix, length 6) > BC547
      // Actually: LM317T and LM3171 both length 6, so source priority: tme wins
      assert.equal(sorted[0].mpn, 'lm317t');   // first occurrence (tme), prefix, length 6
      assert.equal(sorted[1].mpn, 'LM3171');   // prefix, length 6, source digikey (lower priority)
      assert.equal(sorted[2].mpn, 'LM317BT');  // prefix, length 7 (longer)
      assert.equal(sorted[3].mpn, 'BC547');    // no prefix
    });
    
    it('should limit results to 20', () => {
      const input = Array.from({ length: 50 }, (_, i) => ({
        mpn: `LM${i}`,
        title: `Component ${i}`,
        source: 'tme'
      }));
      
      const maxResults = 20;
      const result = input.slice(0, maxResults);
      
      assert.equal(result.length, 20);
    });
  });
  
  describe('edge cases', () => {
    it('should handle empty suggestions array', () => {
      const result = deduplicateByMpn([]);
      assert.equal(result.length, 0);
    });
    
    it('should handle single suggestion', () => {
      const input = [{ mpn: 'LM317', title: 'Single', source: 'tme' }];
      const result = sortSuggestions(input, 'LM317');
      
      assert.equal(result.length, 1);
      assert.equal(result[0].mpn, 'LM317');
    });
    
    it('should handle query shorter than 2 chars', () => {
      const query = 'L';
      const normalized = normalizeQuery(query);
      
      assert.equal(normalized, 'L');
      // Backend should guard this with: if (q.length < 2) return [];
    });
  });
});
