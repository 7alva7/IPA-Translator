/**
 * Korean IPA Translation Tests
 * Tests for processKorean() function
 *
 * Issue #2: Korean post-translation phonology must be OPTIONAL and default to OFF.
 * Raw database IPA is shown unless the user opts in via applyPhonology (the page's
 * "음운 규칙 적용 (Korean phonology)" checkbox).
 *
 * Run: node test/korean/process-korean-text.test.js
 */

import fs from 'node:fs';
import { processKorean } from '../../js/ipa.js';
import { normalizeIPAData } from '../../js/utils.js';

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

console.log('\n=== Korean IPA Translation Tests ===\n');

// Real lookup table built from json/ko.json (loadIPADatabase uses XMLHttpRequest and
// is unavailable in Node, so read + normalize directly).
const rawJSON = JSON.parse(fs.readFileSync(new URL('../../json/ko.json', import.meta.url), 'utf8'));
const lookupTable = normalizeIPAData(rawJSON);

console.log('lookupTable entries: ' + Object.keys(lookupTable).length + '\n');

// The Korean page forwards these via initIPAIndexPage (korean/main.js)
const BASE = { lookupTable, allowWordSearch: true, maxWordLength: 6 };

const ipaOf = (pairs, word) => (pairs.find(([w]) => w === word) || [null, undefined])[1];
const wordsOf = (pairs) => pairs.map(([w]) => w);
const hasIPA = (pairs, ipa) => pairs.some(([, i]) => i === ipa);

// ============================================
// Harness is DOM-free (checkbox state is not exercised here)
// ============================================
console.log('--- DOM-Free Harness ---');
assert('no document in Node harness (checkbox DOM not tested)', typeof document, 'undefined');

// ============================================
// Default is OFF: nasal assimilation not applied
// ============================================
console.log('\n--- Default OFF (nasal assimilation t̚ + n) ---');
const nasalOff = processKorean({ input: '것 나', ...BASE, pairsOnly: true });
assert('것 나 (no applyPhonology key) → 것 stays raw /kʌ̹t̚/',
  ipaOf(nasalOff.pairs, '것'), '/kʌ̹t̚/');
assert('것 나 (no applyPhonology key) → /kʌ̹n/ is absent',
  hasIPA(nasalOff.pairs, '/kʌ̹n/'), false);
assert('것 나 (no applyPhonology key) → 나 stays raw /na̠/',
  ipaOf(nasalOff.pairs, '나'), '/na̠/');

const nasalOffExplicit = processKorean({ input: '것 나', ...BASE, applyPhonology: false, pairsOnly: true });
assert('것 나 applyPhonology: false → 것 stays raw /kʌ̹t̚/',
  ipaOf(nasalOffExplicit.pairs, '것'), '/kʌ̹t̚/');

// ============================================
// Opt-in ON: nasal assimilation applied
// ============================================
console.log('\n--- Opt-in ON (nasal assimilation) ---');
const nasalOn = processKorean({ input: '것 나', ...BASE, applyPhonology: true, pairsOnly: true });
assert('것 나 applyPhonology: true → 것 becomes /kʌ̹n/',
  ipaOf(nasalOn.pairs, '것'), '/kʌ̹n/');
assert('것 나 ON vs OFF actually differ (non-vacuous)',
  JSON.stringify(nasalOn.pairs) !== JSON.stringify(nasalOff.pairs), true);

// ============================================
// Aspiration rule k̚ + h → OFF
// ============================================
console.log('\n--- Aspiration Rule OFF (k̚ + h) ---');
const aspOff = processKorean({ input: '학 하', ...BASE, applyPhonology: false, pairsOnly: true });
assert('학 하 applyPhonology: false → 학 stays /ha̠k̚/',
  ipaOf(aspOff.pairs, '학'), '/ha̠k̚/');
assert('학 하 applyPhonology: false → 하 stays /ha̠/',
  ipaOf(aspOff.pairs, '하'), '/ha̠/');

// ============================================
// Aspiration rule k̚ + h → ON
// ============================================
console.log('\n--- Aspiration Rule ON (k̚ + h) ---');
const aspOn = processKorean({ input: '학 하', ...BASE, applyPhonology: true, pairsOnly: true });
assert('학 하 applyPhonology: true → 학 becomes /ha̠/',
  ipaOf(aspOn.pairs, '학'), '/ha̠/');
assert('학 하 applyPhonology: true → 하 becomes /kʰa̠/',
  ipaOf(aspOn.pairs, '하'), '/kʰa̠/');
assert('학 하 ON vs OFF actually differ (non-vacuous)',
  JSON.stringify(aspOn.pairs) !== JSON.stringify(aspOff.pairs), true);

// ============================================
// pairsOnly shape parity: toggling cannot drop or reorder tokens
// ============================================
console.log('\n--- pairsOnly Shape Parity ---');
for (const [label, off, on] of [['것 나', nasalOff, nasalOn], ['학 하', aspOff, aspOn]]) {
  assert(label + ' OFF returns { result, pairs }',
    JSON.stringify(Object.keys(off)), JSON.stringify(['result', 'pairs']));
  assert(label + ' ON returns { result, pairs }',
    JSON.stringify(Object.keys(on)), JSON.stringify(['result', 'pairs']));
  assert(label + ': same pair count ON vs OFF', on.pairs.length, off.pairs.length);
  assert(label + ': same words in same order ON vs OFF',
    JSON.stringify(wordsOf(on.pairs)), JSON.stringify(wordsOf(off.pairs)));
}

// ============================================
// Page default: absent key behaves identically to applyPhonology: false
// ============================================
console.log('\n--- Page Default (absent key === false) ---');
assert('것 나 absent key deep-equals applyPhonology: false',
  JSON.stringify(nasalOff.pairs), JSON.stringify(nasalOffExplicit.pairs));
assert('학 하 absent key deep-equals applyPhonology: false',
  JSON.stringify(aspOff.pairs),
  JSON.stringify(processKorean({ input: '학 하', ...BASE, pairsOnly: true }).pairs));

// ============================================
// Summary
// ============================================
console.log('\n========================================');
console.log('Results: ' + results.passed + ' passed, ' + results.failed + ' failed');
console.log('========================================\n');

if (results.failed > 0) process.exit(1);

export default results;
