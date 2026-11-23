import type { Context } from '@/machine/context';
import { checkNearAccountExists } from '@/utils/near/checkNearAccountExists';
import { moveTo } from '@/machine';

import { fireEvent } from './utils/fireEvent';
import { validateExternalInputs } from './validateInputs';

jest.mock('@/utils/near/checkNearAccountExists', () => ({
  ACCOUNT_CHECK_SUPERSEDED: 'ACCOUNT_CHECK_SUPERSEDED',
  checkNearAccountExists: jest.fn(),
}));

jest.mock('@/machine', () => ({ moveTo: jest.fn() }));
jest.mock('@/machine/guards', () => ({
  guardStates: (ctx: Context, states: string[]) => states.includes(ctx.state),
}));
jest.mock('./utils/fireEvent', () => ({ fireEvent: jest.fn() }));

const mockCheck = jest.mocked(checkNearAccountExists);
const mockFireEvent = jest.mocked(fireEvent);
const mockMoveTo = jest.mocked(moveTo);

const validCtx = (sendAddress: string) =>
  ({
    state: 'input_valid_external',
    sendAddress,
    walletAddress: 'alice.near',
    targetToken: { blockchain: 'near', isIntent: false },
    error: null,
  }) as unknown as Context;

const flush = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const firedErrorCodes = () =>
  mockFireEvent.mock.calls
    .filter(([event, payload]) => event === 'errorSet' && payload)
    .map(([, payload]) => (payload as { code: string }).code);

describe('validateExternalInputs on a NEAR recipient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [
      'an ETH-style implicit account',
      '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed',
    ],
    ['an ed25519 implicit account', 'a'.repeat(64)],
  ])('lets %s that does not exist yet through', async (_, address) => {
    mockCheck.mockResolvedValue(false);

    validateExternalInputs(validCtx(address));
    await flush();

    expect(firedErrorCodes()).toEqual([]);
    expect(mockFireEvent).toHaveBeenCalledWith(
      'sendAddressNewAccountSet',
      address,
    );
    expect(mockMoveTo).toHaveBeenCalledWith('input_valid_external');
  });

  it('blocks a named account that does not exist', async () => {
    mockCheck.mockResolvedValue(false);

    validateExternalInputs(validCtx('nobody.near'));
    await flush();

    expect(firedErrorCodes()).toEqual(['SEND_ADDRESS_IS_NOT_FOUND']);
    expect(mockMoveTo).toHaveBeenCalledWith('initial_wallet');
  });

  it('does not flag an implicit account that exists', async () => {
    mockCheck.mockResolvedValue(true);

    validateExternalInputs(validCtx('a'.repeat(64)));
    await flush();

    expect(mockFireEvent).toHaveBeenCalledWith(
      'sendAddressNewAccountSet',
      undefined,
    );
  });
});
