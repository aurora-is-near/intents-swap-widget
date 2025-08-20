import { BigNumber } from 'ethers';
import { StreamSchedule } from '../../../src/types/stream';
import { getScheduleStartAndEndTimes } from '../../../src/utils/schedule';

const startTime = new Date('2024-01-01T00:00:00Z').getTime();
const endTime = new Date('2024-02-01T00:00:00Z').getTime();

describe('Schedule', () => {
  describe('getScheduleStartAndEndTimes', () => {
    it('throws if no times found', () => {
      const schedule: StreamSchedule = {
        scheduleTimes: [],
        scheduleRewards: [],
      };

      expect(() => getScheduleStartAndEndTimes(schedule)).toThrow(
        'Invalid schedule: no schedule times found',
      );
    });

    it('returns the start and end times', () => {
      const schedule: StreamSchedule = {
        scheduleTimes: [BigNumber.from(startTime), BigNumber.from(endTime)],
        scheduleRewards: [],
      };

      expect(getScheduleStartAndEndTimes(schedule)).toEqual({
        startTime: startTime * 1000,
        endTime: endTime * 1000,
      });
    });
  });
});
