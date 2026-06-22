import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scorePassword } from './score.js';

// (a) BANDS
test('bands: empty is neutral', () => {
  assert.equal(scorePassword('').band, 'neutral');
});

test('bands: full variety but len<8 is weak', () => {
  assert.equal(scorePassword('Ab1!').band, 'weak');
});

test('bands: len>=8 but single class is weak', () => {
  assert.equal(scorePassword('correcthorsebatterystaple').band, 'weak');
});

test('bands: len 8, 2 classes is fair', () => {
  assert.equal(scorePassword('abcdefg8').band, 'fair');
});

test('bands: len 9, 4 classes blocked by len<12 is fair', () => {
  assert.equal(scorePassword('Password1!').band, 'fair');
});

test('bands: len 13, 4 classes is strong', () => {
  assert.equal(scorePassword('MyDogR3x!2024').band, 'strong');
});

// (b) LENGTH-8 THRESHOLD
test('length-8 threshold: 7-char all-class is weak', () => {
  // 7 chars, all 4 classes present
  assert.equal('aB3$xyz'.length, 7);
  assert.equal(scorePassword('aB3$xyz').band, 'weak');
});

test('length-8 threshold: same content padded to 8 chars is not weak', () => {
  // 8 chars, all 4 classes present
  assert.equal('aB3$xyzw'.length, 8);
  assert.notEqual(scorePassword('aB3$xyzw').band, 'weak');
});

// (c) LENGTH-12 THRESHOLD
test('length-12 threshold: 11-char all-4-class is fair', () => {
  // 11 chars, all 4 classes present
  assert.equal('aB3$xyzwqpr'.length, 11);
  assert.equal(scorePassword('aB3$xyzwqpr').band, 'fair');
});

test('length-12 threshold: 12-char all-4-class is strong', () => {
  // 12 chars, all 4 classes present
  assert.equal('aB3$xyzwqprs'.length, 12);
  assert.equal(scorePassword('aB3$xyzwqprs').band, 'strong');
});

// (d) RULE FLAGS
test('rule flags: aB3$ deep-equals expected and satisfiedCount 4', () => {
  const result = scorePassword('aB3$');
  assert.deepEqual(result.rules, {
    length: false,
    lower: true,
    upper: true,
    digit: true,
    symbol: true,
  });
  assert.equal(result.satisfiedCount, 4);
});

test('rule flags: 10-char all-lowercase sets only length and lower', () => {
  const result = scorePassword('abcdefghij');
  assert.equal('abcdefghij'.length, 10);
  assert.deepEqual(result.rules, {
    length: true,
    lower: true,
    upper: false,
    digit: false,
    symbol: false,
  });
});

test('rule flags: each of the 5 flags is true in at least one case', () => {
  // length true
  assert.equal(scorePassword('abcdefghij').rules.length, true);
  // lower true
  assert.equal(scorePassword('a').rules.lower, true);
  // upper true
  assert.equal(scorePassword('A').rules.upper, true);
  // digit true
  assert.equal(scorePassword('1').rules.digit, true);
  // symbol true
  assert.equal(scorePassword('!').rules.symbol, true);
});

test('rule flags: each of the 5 flags is false in at least one case', () => {
  // length false (short)
  assert.equal(scorePassword('a').rules.length, false);
  // lower false
  assert.equal(scorePassword('A').rules.lower, false);
  // upper false
  assert.equal(scorePassword('a').rules.upper, false);
  // digit false
  assert.equal(scorePassword('a').rules.digit, false);
  // symbol false
  assert.equal(scorePassword('a').rules.symbol, false);
});

// (e) PURITY
test('purity: same value yields deeply-equal results', () => {
  const first = scorePassword('aB3$xyzwqprs');
  const second = scorePassword('aB3$xyzwqprs');
  assert.deepEqual(first, second);
});

test('purity: rules objects from distinct calls are not same reference', () => {
  const first = scorePassword('aB3$xyzwqprs');
  const second = scorePassword('aB3$xyzwqprs');
  assert.notEqual(first.rules, second.rules);
});

test('purity: input is a primitive string and is unchanged (no mutation)', () => {
  const value = 'aB3$xyzwqprs';
  scorePassword(value);
  assert.equal(value, 'aB3$xyzwqprs');
});

// (f) classCount===4 with length 8..11 yields fair
test('classCount 4 with length 8 is fair', () => {
  assert.equal('aB3$wxyz'.length, 8);
  assert.equal(scorePassword('aB3$wxyz').band, 'fair');
});

test('classCount 4 with length 11 is fair', () => {
  assert.equal('aB3$wxyzpqr'.length, 11);
  assert.equal(scorePassword('aB3$wxyzpqr').band, 'fair');
});

// (h) V-4 — whitespace must NOT satisfy the 'symbol' rule (a space is not a symbol).
test('symbol: whitespace does not count as a symbol', () => {
  assert.equal(scorePassword('abcde fg').rules.symbol, false); // space is not a symbol
  assert.equal(scorePassword('!').rules.symbol, true); // a real symbol still counts
});

test('symbol: a string of 8 spaces is weak (not fair) — no symbol, single/zero class', () => {
  const r = scorePassword('        '); // 8 spaces
  assert.equal(r.rules.length, true); // 8 chars
  assert.equal(r.rules.symbol, false); // whitespace excluded
  assert.equal(r.band, 'weak'); // length>=8 but classCount<=1
});

// (g) U6 — zero-exfiltration static-source guard (acceptance #9; reinforces #7/#8/#10).
// Reads the shipped source and asserts the no-exfiltration / static-deploy floors hold.
const scoreSrc = readFileSync(new URL('./score.js', import.meta.url), 'utf8');
const htmlSrc = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

test('guard: score.js source has no network/IO tokens', () => {
  assert.doesNotMatch(scoreSrc, /\bfetch\b|XMLHttpRequest|console\.|localStorage|sessionStorage|sendBeacon/);
});

test('guard: index.html script has no network/IO of the value', () => {
  assert.doesNotMatch(htmlSrc, /\bfetch\b|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|console\./);
});

test('guard: index.html imports only the sibling-relative ./score.js (no root-relative, no external)', () => {
  const imports = [...htmlSrc.matchAll(/import\s+[^'"]*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.deepEqual(imports, ['./score.js']);
  assert.doesNotMatch(htmlSrc, /['"]\/score\.js['"]/); // never root-relative
  assert.doesNotMatch(htmlSrc, /https?:\/\/|@import|<script\s+src=|<link\b|<img\b|cdn\.|googleapis/i);
});

test('guard: index.html live region is polite, never assertive/alert', () => {
  assert.doesNotMatch(htmlSrc, /aria-live\s*=\s*["']assertive["']|role\s*=\s*["']alert["']/i);
  assert.match(htmlSrc, /id="live"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
});

test('guard: no security-guarantee vocabulary (secure/safe) in index.html copy', () => {
  assert.doesNotMatch(htmlSrc, /\bsecure\b|\bsafe\b/i);
});

// R5-2 — neutral band must not announce (AC1/AC8 regression guard): BAND_MAP neutral livePhrase is empty.
test('guard: BAND_MAP neutral band has an empty livePhrase (no announcement on empty input)', () => {
  assert.match(htmlSrc, /neutral:\s*\{[^}]*livePhrase:\s*''/);
});
