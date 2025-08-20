import { getStreamsProgress } from '../../../src/utils/progress';
import { streamsSchedule } from '../../fixtures/streams-schedule';

jest.useFakeTimers().setSystemTime(new Date('2024-11-12T00:00:00Z'));

describe('Progress', () => {
  describe('getStreamsProgress', () => {
    it('returns the progress of each stream', () => {
      expect(getStreamsProgress(streamsSchedule)).toMatchSnapshot();
    });
  });
});
