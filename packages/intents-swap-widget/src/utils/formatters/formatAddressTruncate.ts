type Args =
  | { mode: 'manual'; leftVisible: number; rightVisible: number }
  | { mode: 'auto'; totalVisible: number }
  | number;

const autoFormat = (input: string, totalVisible: number) => {
  if (totalVisible <= 0) {
    return '';
  }

  if (input.length <= totalVisible) {
    return input;
  }

  const left = Math.floor(totalVisible / 2);
  const right = totalVisible - left;

  if (totalVisible === 1) {
    return `${input.slice(0, 1)}...`;
  }

  return `${input.slice(0, left)}...${input.slice(-right)}`;
};

export const formatAddressTruncate = (input: string, args: Args) => {
  if (typeof args === 'number') {
    return autoFormat(input, args);
  }

  if (args.mode === 'auto') {
    const { totalVisible } = args;

    return autoFormat(input, totalVisible);
  }

  const { leftVisible, rightVisible } = args;

  if (leftVisible <= 0 && rightVisible <= 0) {
    return '';
  }

  if (input.length <= leftVisible + rightVisible) {
    return input;
  }

  const left = Math.floor(leftVisible);
  const right = Math.floor(rightVisible);

  if (leftVisible + rightVisible === 1) {
    return `${input.slice(0, 1)}...`;
  }

  return `${input.slice(0, left)}...${input.slice(-right)}`;
};
