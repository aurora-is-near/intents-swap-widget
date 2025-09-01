export const formatAddressTruncate = (
  input: string,
  totalVisible: number = 40,
) => {
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
