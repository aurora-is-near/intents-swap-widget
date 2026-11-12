import { FundingError } from '@aurora-is-near/intents-connect';
import { describe, expect, it } from 'vitest';

import { describeFailure } from './describeFailure';

describe('describeFailure', () => {
  it("words a failed last step: the funds stay with the wallet's account", () => {
    expect(
      describeFailure(new Error('execution OPERATION_FAILED'), 'USDC'),
    ).toEqual({
      title: "The supply didn't go through",
      detail:
        "Its last step failed, so the funds stay with this wallet's Aurora account. Try again in a moment.",
    });
  });

  it('falls back to the message', () => {
    expect(describeFailure(new Error('something odd'), 'USDC')).toEqual({
      title: 'The supply stopped',
      detail: 'something odd',
    });
  });

  it('words what stopped a move from intents balances', () => {
    expect(
      describeFailure(new FundingError('USER_REJECTED', 'declined'), 'USDC'),
    ).toEqual({
      title: 'You declined in your wallet',
      detail: 'Nothing moved.',
    });
    expect(
      describeFailure(
        new FundingError('QUOTE_FAILED', 'Amount is too low for bridge'),
        'USDC',
      ),
    ).toEqual({
      title: "Couldn't get a quote",
      detail: 'Amount is too low for bridge',
    });
  });
});
