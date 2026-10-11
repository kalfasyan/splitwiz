// Money is handled as integer cents everywhere; these helpers convert to and
// from what people type and read.

const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' });

export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/** Parses "12", "12.5", "12,50" or "1.234,56" into cents. Returns null when invalid. */
export function parseAmount(input: string): number | null {
  let s = input.trim().replace(/[€\s]/g, '');
  if (!s) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  const decimalSep = lastComma > lastDot ? ',' : '.';
  const thousandsSep = decimalSep === ',' ? '.' : ',';

  s = s.split(thousandsSep).join('');
  if (decimalSep === ',') s = s.replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;

  const cents = Math.round(parseFloat(s) * 100);
  return cents > 0 ? cents : null;
}

/** Same rules as the server's ledger.OwedCents, used for the live preview in the form. */
export function owedCents(
  amount: number,
  mode: string,
  payerPercent: number,
  otherShare: number,
): number | null {
  if (!(amount > 0)) return null;
  switch (mode) {
    case 'equal':
      return Math.floor(amount / 2);
    case 'percent': {
      if (payerPercent < 0 || payerPercent > 100) return null;
      const bp = Math.floor(payerPercent * 100 + 0.5);
      return Math.floor((amount * (10000 - bp)) / 10000);
    }
    case 'exact':
      return otherShare >= 0 && otherShare <= amount ? otherShare : null;
    case 'full':
      return amount;
  }
  return null;
}
