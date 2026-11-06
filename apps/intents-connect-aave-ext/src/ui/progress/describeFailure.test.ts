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
});
