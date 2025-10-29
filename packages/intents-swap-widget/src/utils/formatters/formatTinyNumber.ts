type Options = {
  minZeros?: number;
  leadingZeros?: number;
  maxNonZeroPartDecimals?: number;
};

const toDecimalString = (num: number) => {
  if (num === 0) {
    return '0';
  }

  const s = num.toString();

  if (!s.includes('e')) {
    return s;
  }

  // Split number and exponent parts
  const [part01 = '', part02 = ''] = s.split('e');
  let base = part01.replace('.', '');
  const exp = parseInt(part02, 10);

  const decimalPos = part01.indexOf('.');

  if (exp < 0) {
    const zeros = Math.abs(exp) - (decimalPos === -1 ? 0 : decimalPos);

    base = '0'.repeat(zeros) + base;

    return `0.${base}`;
  }

  if (decimalPos === -1) {
    // No decimal point in base
    if (exp >= base.length) {
      return base + '0'.repeat(exp - base.length);
    }

    return `${base.slice(0, exp)}.${base.slice(exp)}`;
  }

  const intPartLength = decimalPos;
  const pointIndex = intPartLength + exp;

  if (pointIndex >= base.length) {
    return base + '0'.repeat(pointIndex - base.length);
  }

  return `${base.slice(0, pointIndex)}.${base.slice(pointIndex)}`;
};

export const formatTinyNumber = (
  num: number,
  { leadingZeros = 1, maxNonZeroPartDecimals = 3, minZeros = 3 }: Options = {},
): string | [string, string, string] => {
  if (num < 1 && num > 0.099999999999) {
    const res = `${num}`.substring(0, maxNonZeroPartDecimals + 2);

    return parseFloat(res).toLocaleString();
  }

  if (num > 1) {
    const [intPart = '0', fracPart = ''] = `${num}`.split('.');

    if (!fracPart) {
      return parseFloat(intPart).toLocaleString();
    }

    const res = `${intPart}.${fracPart.substring(0, maxNonZeroPartDecimals)}`;

    return parseFloat(res).toLocaleString();
  }

  if (num >= 1 / 10 ** leadingZeros || num <= 0) {
    const res = `${num}`;

    return parseFloat(res).toLocaleString();
  }

  // Convert to decimal string without 'e'
  const str = toDecimalString(num);
  const frac = str.split('.')[1] ?? '';

  // Count leading zeros in fraction
  const match = frac.match(/^0+/);
  const zeros = match ? match[0].length : 0;

  const remaining = frac.slice(zeros);

  if (zeros <= minZeros) {
    return `0.${'0'.repeat(zeros)}${remaining.substring(0, maxNonZeroPartDecimals)}`;
  }

  const show = Math.min(leadingZeros, zeros);
  const replace = zeros - show;

  if (replace === 0) {
    return `${num}`;
  }

  const resultParts = [];
  const firstPart = `0.${'0'.repeat(show)}`;

  resultParts.push(firstPart);
  resultParts.push(`${replace + 1}`);

  if (remaining.length > 0) {
    resultParts.push(remaining.substring(0, maxNonZeroPartDecimals));
  }

  return resultParts as [string, string, string];
};
