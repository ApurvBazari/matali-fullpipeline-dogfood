// Single source of truth for password scoring.
// Pure ES module: no DOM, no network, no storage, no logging — both the page
// and the tests import this same evaluate().

/**
 * Evaluate a candidate value against the five strength rules and derive a tier.
 *
 * @param {string} value
 * @returns {{
 *   rules: { length: boolean, lower: boolean, upper: boolean, digit: boolean, symbol: boolean },
 *   tier: 'Weak' | 'Fair' | 'Strong'
 * }}
 */
export function evaluate(value) {
  const rules = {
    length: value.length >= 8,
    lower: /[a-z]/.test(value),
    upper: /[A-Z]/.test(value),
    digit: /[0-9]/.test(value),
    symbol: /[^A-Za-z0-9\s]/u.test(value),
  };

  const count =
    (rules.length ? 1 : 0) +
    (rules.lower ? 1 : 0) +
    (rules.upper ? 1 : 0) +
    (rules.digit ? 1 : 0) +
    (rules.symbol ? 1 : 0);

  let tier;
  if (count < 3 || value.length < 8) {
    tier = 'Weak';
  } else if (count === 5 && value.length >= 12) {
    tier = 'Strong';
  } else {
    tier = 'Fair';
  }

  return { rules, tier };
}
