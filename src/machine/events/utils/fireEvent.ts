import { machine } from '@/machine/machine';
import type { TradeEvents } from '@/machine/events';

export const fireEvent = <E extends keyof TradeEvents>(
  event: E,
  payload: TradeEvents[E],
) => {
  machine.fire(event, payload);
};
