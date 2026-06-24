// scorer.test.js — node:test suite for scorer.js
// Imports only node built-ins and the repo's own scorer.js (F1/F10/F11).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from './scorer.js';

// ---------------------------------------------------------------------------
// 1. Predicate suite — table-driven over all 5 rules
// ---------------------------------------------------------------------------
test('predicate suite — empty string → all false', () => {
  const { rules } = evaluate('');
  assert.deepEqual(rules, {
    length: false,
    lower: false,
    upper: false,
    digit: false,
    symbol: false,
  });
});

test('predicate suite — single lowercase letter → only lower true', () => {
  const { rules } = evaluate('a');
  assert.equal(rules.length, false);
  assert.equal(rules.lower, true);
  assert.equal(rules.upper, false);
  assert.equal(rules.digit, false);
  assert.equal(rules.symbol, false);
});

test('predicate suite — single uppercase letter → only upper true', () => {
  const { rules } = evaluate('A');
  assert.equal(rules.length, false);
  assert.equal(rules.lower, false);
  assert.equal(rules.upper, true);
  assert.equal(rules.digit, false);
  assert.equal(rules.symbol, false);
});

test('predicate suite — single digit → only digit true', () => {
  const { rules } = evaluate('1');
  assert.equal(rules.length, false);
  assert.equal(rules.lower, false);
  assert.equal(rules.upper, false);
  assert.equal(rules.digit, true);
  assert.equal(rules.symbol, false);
});

test('predicate suite — single symbol → only symbol true', () => {
  const { rules } = evaluate('!');
  assert.equal(rules.length, false);
  assert.equal(rules.lower, false);
  assert.equal(rules.upper, false);
  assert.equal(rules.digit, false);
  assert.equal(rules.symbol, true);
});

test('predicate suite — spaces only → symbol false (whitespace never earns symbol)', () => {
  const { rules } = evaluate('   ');
  // 3 spaces: length false (<8), all class rules false; symbol regex excludes \s
  assert.equal(rules.symbol, false);
  assert.equal(rules.lower, false);
  assert.equal(rules.upper, false);
  assert.equal(rules.digit, false);
});

test('predicate suite — £ (Unicode non-ASCII non-space non-alnum) → symbol true', () => {
  const { rules } = evaluate('£');
  assert.equal(rules.symbol, true);
});

test('predicate suite — 8 lowercase chars → length+lower true, others false', () => {
  // 'abcdefgh' is exactly 8 chars, all lowercase
  const { rules } = evaluate('abcdefgh');
  assert.equal(rules.length, true);
  assert.equal(rules.lower, true);
  assert.equal(rules.upper, false);
  assert.equal(rules.digit, false);
  assert.equal(rules.symbol, false);
});

// ---------------------------------------------------------------------------
// 2. Tier-boundary suite — four named spec reference vectors
// ---------------------------------------------------------------------------
test('tier boundary — empty string → Weak', () => {
  assert.equal(evaluate('').tier, 'Weak');
});

test('tier boundary — 8-char lowercase only → Weak', () => {
  // count=2 (length+lower), count<3 → Weak
  assert.equal(evaluate('abcdefgh').tier, 'Weak');
});

test('tier boundary — abc12345 (8 chars, count=3) → Fair (count=3 boundary: not Weak, not Strong)', () => {
  // 'abc12345': length=true, lower=true, digit=true, upper=false, symbol=false → count=3, len=8>=8 → Fair
  const { rules, tier } = evaluate('abc12345');
  assert.equal(rules.length, true);
  assert.equal(rules.lower, true);
  assert.equal(rules.digit, true);
  assert.equal(rules.upper, false);
  assert.equal(rules.symbol, false);
  assert.equal(tier, 'Fair');
});

test('tier boundary — Password1! (9 chars, all 5 rules) → Fair (not Strong: len<12)', () => {
  // len=9, lower+upper+digit+symbol all true → count=5, but len<12 → Fair
  assert.equal(evaluate('Password1!').tier, 'Fair');
});

test('tier boundary — Password123! (12 chars, all 5 rules) → Strong', () => {
  // len=12, all 5 rules → count=5, len>=12 → Strong
  assert.equal(evaluate('Password123!').tier, 'Strong');
});

// ---------------------------------------------------------------------------
// 3. Gate-edge suite
// ---------------------------------------------------------------------------
test('gate edge — 11-char all-5-rules string → Fair (length<12 gate)', () => {
  // 'Password1!x' → len=11, lower+upper+digit+symbol all true → count=5, len<12 → Fair
  assert.equal(evaluate('Password1!x').tier, 'Fair');
});

test('gate edge — 12-char all-5-rules string → Strong (locks length-12 gate)', () => {
  // 'Password12!x' → len=12, all 5 rules → count=5, len>=12 → Strong
  assert.equal(evaluate('Password12!x').tier, 'Strong');
});

test('gate edge — 7-char all-classes string → Weak (length<8 floor)', () => {
  // 'Pass1!x' → len=7, lower+upper+digit+symbol all true, but length rule false
  // count=4, value.length<8 → Weak
  assert.equal(evaluate('Pass1!x').tier, 'Weak');
});

test('gate edge — 12-char 4-rules string → Fair (count<5 prevents Strong)', () => {
  // 'Password1234' → len=12, lower+upper+digit=true, symbol=false → count=4 → Fair
  assert.equal(evaluate('Password1234').tier, 'Fair');
});

test('gate edge — long (>=8) lowercase-only string → Weak (count<3 floor)', () => {
  // 'abcdefghij' → len=10, lower=true only → count=2, count<3 → Weak
  assert.equal(evaluate('abcdefghij').tier, 'Weak');
});

// ---------------------------------------------------------------------------
// 4. Shape — every evaluate() return has boolean rules and a valid tier
// ---------------------------------------------------------------------------
test('shape — every evaluate() return has boolean rules and tier in {Weak,Fair,Strong}', () => {
  const samples = [
    '',
    'a',
    'A',
    '1',
    '!',
    'abcdefgh',
    'Password1!',
    'Password123!',
    'Password1!x',
    'Password12!x',
    'Pass1!x',
    'Password1234',
    'abcdefghij',
  ];

  const validTiers = new Set(['Weak', 'Fair', 'Strong']);

  for (const s of samples) {
    const result = evaluate(s);
    assert.ok(result && typeof result === 'object', `evaluate(${JSON.stringify(s)}) must return an object`);
    assert.ok(result.rules && typeof result.rules === 'object', `result.rules must be an object for ${JSON.stringify(s)}`);
    for (const key of ['length', 'lower', 'upper', 'digit', 'symbol']) {
      assert.equal(
        typeof result.rules[key],
        'boolean',
        `rules.${key} must be boolean for ${JSON.stringify(s)}`,
      );
    }
    assert.ok(validTiers.has(result.tier), `tier must be Weak|Fair|Strong for ${JSON.stringify(s)}, got ${result.tier}`);
  }
});
