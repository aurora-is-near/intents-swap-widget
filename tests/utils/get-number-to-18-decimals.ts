import { BigNumber } from 'ethers';

export const getNumberTo18Decimals = (number: number) => {
  return BigNumber.from(`${number}${'0'.repeat(18)}`);
};
