import { calculateStakedPctOfSupply } from '../../../src/utils/supply';
import { getNumberTo18Decimals } from '../../utils/get-number-to-18-decimals';

describe('Supply', () => {
  describe('calculateStakedPctOfSupply', () => {
    it('returns the expected result with 1% staked', () => {
      const result = calculateStakedPctOfSupply({
        totalStaked: getNumberTo18Decimals(1000),
        auroraPrice: 0.1,
        auroraMarketCap: 10000,
      });

      expect(result).toBe(1);
    });

    it('returns the expected result with 50% staked', () => {
      const result = calculateStakedPctOfSupply({
        totalStaked: getNumberTo18Decimals(50000),
        auroraPrice: 0.1,
        auroraMarketCap: 10000,
      });

      expect(result).toBe(50);
    });
  });
});
