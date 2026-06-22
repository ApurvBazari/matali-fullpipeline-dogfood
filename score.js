export function scorePassword(value) {
  const rules = {
    length: value.length >= 8,
    lower: /[a-z]/.test(value),
    upper: /[A-Z]/.test(value),
    digit: /[0-9]/.test(value),
    symbol: /[^A-Za-z0-9\s]/.test(value),
  };

  const satisfiedCount =
    (rules.length ? 1 : 0) +
    (rules.lower ? 1 : 0) +
    (rules.upper ? 1 : 0) +
    (rules.digit ? 1 : 0) +
    (rules.symbol ? 1 : 0);

  const classCount =
    (rules.lower ? 1 : 0) +
    (rules.upper ? 1 : 0) +
    (rules.digit ? 1 : 0) +
    (rules.symbol ? 1 : 0);

  let band;
  if (value.length === 0) {
    band = 'neutral';
  } else if (value.length < 8 || classCount <= 1) {
    band = 'weak';
  } else if (value.length >= 12 && classCount === 4) {
    band = 'strong';
  } else {
    band = 'fair';
  }

  return { band, rules, satisfiedCount };
}
