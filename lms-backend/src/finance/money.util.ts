// All financial maths uses integer paise (bigint). Never use JS floats for money.

const MONEY_PATTERN = /^-?\d+(\.\d{1,2})?$/;
const PERCENT_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

/** "1000.50" -> 100050n. Accepts Postgres numeric strings. Rejects anything with >2 decimals. */
export function toPaise(value: string | number): bigint {
  const text = (typeof value === 'number' ? String(value) : value).trim();
  if (!MONEY_PATTERN.test(text)) {
    throw new Error(`Invalid money value "${text}" (max 2 decimal places)`);
  }
  const negative = text.startsWith('-');
  const [whole, fraction = ''] = (negative ? text.slice(1) : text).split('.');
  const paise = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return negative ? -paise : paise;
}

/** 100050n -> "1000.50"  (-30000n -> "-300.00") */
export function fromPaise(paise: bigint): string {
  const negative = paise < 0n;
  const abs = negative ? -paise : paise;
  const whole = abs / 100n;
  const fraction = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

/** "30.00" -> 3000n basis points (hundredths of a percent). Range 0..100. */
export function percentToBps(value: string | number): bigint {
  const text = String(value).trim();
  if (!PERCENT_PATTERN.test(text)) {
    throw new Error(`Invalid percentage "${text}"`);
  }
  const [whole, fraction = ''] = text.split('.');
  const bps = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (bps > 10000n) throw new Error(`Percentage out of range: ${text}`);
  return bps;
}

/** 3000n -> "30.00" */
export function bpsToPercent(bps: bigint): string {
  return fromPaise(bps);
}

/** round(n / d), halves rounded away from zero. d must be > 0. */
export function divRoundHalfUp(n: bigint, d: bigint): bigint {
  if (d <= 0n) throw new Error('Divisor must be positive');
  if (n < 0n) return -divRoundHalfUp(-n, d);
  return (2n * n + d) / (2n * d);
}

/** amountPaise * (bps / 10000), rounded half-up to a whole paisa. */
export function percentOf(amountPaise: bigint, bps: bigint): bigint {
  return divRoundHalfUp(amountPaise * bps, 10000n);
}