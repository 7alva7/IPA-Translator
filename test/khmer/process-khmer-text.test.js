/**
 * Khmer IPA Translation Tests
 * Tests for processKhmerText() function
 */

import { processKhmerText } from '../../js/ipa.js';

const results = { passed: 0, failed: 0, tests: [] };

function assert(name, actual, expected) {
  const passed = actual === expected;
  if (passed) {
    results.passed++;
    results.tests.push({ name, status: 'PASS', actual, expected });
    console.log('✓ ' + name);
  } else {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', actual, expected });
    console.log('✗ ' + name);
    console.log('  Expected: ' + JSON.stringify(expected));
    console.log('  Actual:   ' + JSON.stringify(actual));
  }
}

console.log('\n=== Khmer IPA Translation Tests ===\n');

// Sample lookup table with entries from km.json
const db = {
  '។ល។': '/laʔ/',
  'ក': '/kɑɑ/',
  'កក់': '/kɑk/',
  'កក់សក់': '/kɑk sɑk/',
  'សក់': '/sɑk/',
  'ល': '/lɔɔ/',
  'សួស្តី': '/sūətī/',
  'ភាសា': '/pʰiːsaː/',
  'ខ្មែរ': '/kmae/',
  'អ': '/ʔ/',
  'រ': '/roo/',
};

// ============================================
// Bug 1: Compound word matching
// ============================================
console.log('--- Compound Word Matching ---');
assert('កក់សក់ → /kɑk sɑk/ (not split into កក់ + សក់)',
  processKhmerText({ input: 'កក់សក់', lookupTable: db }),
  '/kɑk sɑk/');

assert('កក់សក់ withWords → ( កក់សក់ /kɑk sɑk/ )',
  processKhmerText({ input: 'កក់សក់', lookupTable: db, withWords: true }),
  '( កក់សក់ /kɑk sɑk/ )');

// ============================================
// Bug 2: Symbol abbreviation matching
// ============================================
console.log('\n--- Symbol Abbreviation Matching ---');
assert('។ល។ → /laʔ/ (not split into ។ + ល + ។)',
  processKhmerText({ input: '។ល។', lookupTable: db }),
  '/laʔ/');

assert('។ល។ withWords → ( ។ល។ /laʔ/ )',
  processKhmerText({ input: '។ល។', lookupTable: db, withWords: true }),
  '( ។ល។ /laʔ/ )');

// ============================================
// pairsOnly mode
// ============================================
console.log('\n--- pairsOnly Mode ---');
{
  const r1 = processKhmerText({ input: 'កក់សក់', lookupTable: db, pairsOnly: true });
  assert('កក់សក់ pairsOnly returns single pair',
    JSON.stringify(r1.pairs),
    JSON.stringify([['កក់សក់', '/kɑk sɑk/']]));

  const r2 = processKhmerText({ input: '។ល។', lookupTable: db, pairsOnly: true });
  assert('។ល។ pairsOnly returns single pair',
    JSON.stringify(r2.pairs),
    JSON.stringify([['។ល។', '/laʔ/']]));
}

// ============================================
// Unknown words fall through to segmenter + cluster fallback
// ============================================
console.log('\n--- Unknown Word Fallback ---');
assert('Single known consonant',
  processKhmerText({ input: 'ក', lookupTable: db }),
  '/kɑɑ/');

assert('Multiple known words separated by space',
  processKhmerText({ input: 'សួស្តី ខ្មែរ', lookupTable: db }),
  '/sūətī/ /kmae/');

// ============================================
// Hidden character cleaning
// ============================================
console.log('\n--- Hidden Character Cleaning ---');
assert('Zero-width space cleaned before processing',
  processKhmerText({ input: 'ក​ក់', lookupTable: db }),
  '/kɑk/');

// ============================================
// Edge cases
// ============================================
console.log('\n--- Edge Cases ---');
assert('Empty input returns empty string',
  processKhmerText({ input: '', lookupTable: db }),
  '');

assert('Unknown character passes through',
  processKhmerText({ input: '!', lookupTable: db }),
  '!');

// ============================================
// Summary
// ============================================
console.log('\n========================================');
console.log('Results: ' + results.passed + ' passed, ' + results.failed + ' failed');
console.log('========================================\n');

export default results;
