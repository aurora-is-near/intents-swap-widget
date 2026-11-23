import { checkNearAccountExists } from './checkNearAccountExists';
import { getNearSingleRpcClient } from './rpc';

jest.mock('./rpc', () => ({ getNearSingleRpcClient: jest.fn() }));
jest.mock('@/logger', () => ({ logger: { error: jest.fn() } }));

const query = jest.fn();

jest.mocked(getNearSingleRpcClient).mockReturnValue({
  query,
} as unknown as ReturnType<typeof getNearSingleRpcClient>);

const accountMissing = () =>
  query.mockRejectedValueOnce(new Error('account does not exist'));

describe('checkNearAccountExists', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    query.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const check = async (accountId: string) => {
    const result = checkNearAccountExists(accountId);

    await jest.runAllTimersAsync();

    return result;
  };

  it('checks a missing implicit account again, since a transfer creates it', async () => {
    const accountId = 'b'.repeat(64);

    accountMissing();

    expect(await check(accountId)).toBe(false);

    query.mockResolvedValueOnce({});

    expect(await check(accountId)).toBe(true);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('remembers a missing named account', async () => {
    accountMissing();

    expect(await check('nobody.near')).toBe(false);
    expect(await check('nobody.near')).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
