import { BigNumber } from 'ethers';
import { calculateAprs } from '../../../src/utils/apr';
import { streamsSchedule } from '../../fixtures/streams-schedule';
import { getNumberTo18Decimals } from '../../utils/get-number-to-18-decimals';

jest.useFakeTimers();

const currentDate = new Date('2024-11-13T12:00:00Z');

const totalStaked = getNumberTo18Decimals(50000000);
const streamDecimals = [18, 18, 18, 18, 18, 18];
const streamPrices = [
  0.135344, 0.00007611, 0.00141883, 0.00000127, 0.245603, 0,
];

describe('APR', () => {
  beforeEach(() => {
    jest.setSystemTime(new Date(currentDate));
  });

  describe('calculateAprs', () => {
    it('returns the expected APR', async () => {
      const result = calculateAprs({
        streamsSchedule,
        streamPrices,
        streamDecimals,
        totalStaked,
      });

      expect(result).toEqual({
        aurora: 13.65590130885746,
        streams: [0, 0, 0, 0, 0],
        total: 13.65590130885746,
      });
    });

    it('modifies the APR according to the total amount staked', async () => {
      const result = calculateAprs({
        streamsSchedule,
        streamPrices,
        streamDecimals,
        totalStaked: BigNumber.from('100000000000000000000000000'),
      });

      expect(result).toEqual({
        aurora: 6.82795065442873,
        streams: [0, 0, 0, 0, 0],
        total: 6.82795065442873,
      });
    });

    it('returns an APR of 0 if all rewards are active after the current date', async () => {
      jest.setSystemTime(new Date('2020-01-01T12:00:00Z'));

      const result = calculateAprs({
        streamsSchedule,
        streamPrices,
        streamDecimals,
        totalStaked,
      });

      expect(result).toEqual({
        aurora: 0,
        streams: [0, 0, 0, 0, 0],
        total: 0,
      });
    });

    it('returns an APR of 0 if all rewards were active before the current date', async () => {
      jest.setSystemTime(new Date('2030-01-01T12:00:00Z'));

      const result = calculateAprs({
        streamsSchedule,
        streamPrices,
        streamDecimals,
        totalStaked,
      });

      expect(result).toEqual({
        aurora: 0,
        streams: [0, 0, 0, 0, 0],
        total: 0,
      });
    });

    it('returns an APR of 0 if all stream prices are zero', async () => {
      jest.setSystemTime(new Date('2020-01-01T12:00:00Z'));

      const result = calculateAprs({
        streamsSchedule,
        streamPrices: Array(streamPrices.length).fill(0),
        streamDecimals,
        totalStaked,
      });

      expect(result).toEqual({
        aurora: 0,
        streams: [0, 0, 0, 0, 0],
        total: 0,
      });
    });

    it('throws if a stream price is missing', async () => {
      jest.setSystemTime(new Date('2020-01-01T12:00:00Z'));

      expect(() => {
        calculateAprs({
          streamsSchedule,
          streamPrices: [],
          streamDecimals,
          totalStaked,
        });
      }).toThrow('No stream price at position 0');
    });
  });
});
