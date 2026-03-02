type Args =
  | { mode: 'manual'; leftVisible: number; rightVisible: number }
  | { mode: 'auto'; totalVisible: number };

export const formatAddressTruncate = (input: string, args: Args) => {
  if (args.mode === 'auto') {
    const { totalVisible } = args;

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
