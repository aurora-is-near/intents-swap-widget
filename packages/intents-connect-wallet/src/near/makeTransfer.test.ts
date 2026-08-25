import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeTransfer } from '@/near/makeTransfer';
import type { NearTransaction } from '@/near/types';

const DEPOSIT_ADDRESS = 'deposit-1click.near';
const TOKEN = 'usdc.tether-token.near';

const viewResult = (value: unknown) => ({
  ok: true,
  json: async () => ({
    result: {
      result: Array.from(new TextEncoder().encode(JSON.stringify(value))),
    },
  }),
});

const stubWallet = () => {
  const signAndSendTransactions = vi
    .fn()
    .mockResolvedValue([{ transaction: { hash: 'near-tx-hash' } }]);

  return { signAndSendTransactions };
};

const sentTx = (wallet: ReturnType<typeof stubWallet>): NearTransaction => {
  const [call] = wallet.signAndSendTransactions.mock.calls as [
    [{ transactions: NearTransaction[] }],
  ];

  return call[0].transactions[0]!;
};

/** min storage bounds, then the recipient's current storage balance. */
const stubStorage = (recipientTotal: string | null, min = '1250') => {
  const fetchMock = vi
    .fn()
    .mockImplementation(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as {
        params: { method_name: string };
      };

      return body.params.method_name === 'storage_balance_bounds'
        ? viewResult({ min, max: min })
        : viewResult(
            recipientTotal === null ? null : { total: recipientTotal },
          );
    });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('native NEAR', () => {
  it('sends a plain Transfer of yoctoNEAR to the deposit address', async () => {
    const wallet = stubWallet();

    const result = await makeTransfer(
      {
        address: DEPOSIT_ADDRESS,
        amountAtomic: '1000000000000000000000000',
        decimals: 24,
        chain: 'near',
      },
      { wallet },
    );

    expect(result).toEqual({ hash: 'near-tx-hash' });

    const tx = sentTx(wallet);

    expect(tx.receiverId).toBe(DEPOSIT_ADDRESS);
    expect(tx.actions).toEqual([
      { type: 'Transfer', params: { deposit: '1000000000000000000000000' } },
    ]);
  });

  it('makes no view calls for a native transfer', async () => {
    const fetchMock = stubStorage('0');

    await makeTransfer(
      {
        address: DEPOSIT_ADDRESS,
        amountAtomic: '1',
        decimals: 24,
        chain: 'near',
      },
      { wallet: stubWallet() },
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('NEP-141 token', () => {
  it('uses ft_transfer by default, not ft_transfer_call', async () => {
    // The 1Click deposit address is a plain account with no ft_on_transfer, so
    // ft_transfer_call would be refunded.
    stubStorage('1250');

    const wallet = stubWallet();

    await makeTransfer(
      {
        address: DEPOSIT_ADDRESS,
        amountAtomic: '5000000',
        decimals: 6,
        tokenAddress: TOKEN,
        chain: 'near',
      },
      { wallet },
    );

    const tx = sentTx(wallet);

    expect(tx.receiverId).toBe(TOKEN);
    expect(tx.actions).toHaveLength(1);
    expect(tx.actions[0]).toEqual({
      type: 'FunctionCall',
      params: {
        methodName: 'ft_transfer',
        args: { receiver_id: DEPOSIT_ADDRESS, amount: '5000000' },
        gas: `50${'0'.repeat(12)}`,
        deposit: '1',
      },
    });
  });

  it('switches to ft_transfer_call and forwards msg when one is given', async () => {
    stubStorage('1250');

    const wallet = stubWallet();

    await makeTransfer(
      {
        address: DEPOSIT_ADDRESS,
        amountAtomic: '5000000',
        decimals: 6,
        tokenAddress: TOKEN,
        chain: 'near',
      },
      { wallet, msg: 'hello' },
    );

    expect(sentTx(wallet).actions[0]).toMatchObject({
      params: { methodName: 'ft_transfer_call', args: { msg: 'hello' } },
    });
  });

  it('prepends storage_deposit when the recipient is unregistered', async () => {
    // storage_balance_of returns null for an account that has never been
    // registered; without the top-up the transfer fails on-chain.
    stubStorage(null, '1250');

    const wallet = stubWallet();

    await makeTransfer(
      {
        address: DEPOSIT_ADDRESS,
        amountAtomic: '5000000',
        decimals: 6,
        tokenAddress: TOKEN,
        chain: 'near',
      },
      { wallet },
    );

    const { actions } = sentTx(wallet);

    expect(actions).toHaveLength(2);
    expect(actions[0]).toEqual({
      type: 'FunctionCall',
      params: {
        methodName: 'storage_deposit',
        args: { account_id: DEPOSIT_ADDRESS },
        gas: `30${'0'.repeat(12)}`,
        deposit: '1250',
      },
    });
  });

  it('skips storage_deposit when the recipient is already covered', async () => {
    stubStorage('9999', '1250');

    const wallet = stubWallet();

    await makeTransfer(
      {
        address: DEPOSIT_ADDRESS,
        amountAtomic: '5000000',
        decimals: 6,
        tokenAddress: TOKEN,
        chain: 'near',
      },
      { wallet },
    );

    expect(sentTx(wallet).actions).toHaveLength(1);
  });
});

describe('failure modes', () => {
  it('rejects rather than resolving undefined when the wallet returns nothing', async () => {
    // The widget hook swallowed user rejection and returned undefined; the
    // runner needs a rejection so the phase machine can fail.
    stubStorage('1250');

    await expect(
      makeTransfer(
        {
          address: DEPOSIT_ADDRESS,
          amountAtomic: '1',
          decimals: 6,
          tokenAddress: TOKEN,
          chain: 'near',
        },
        { wallet: { signAndSendTransactions: vi.fn().mockResolvedValue([]) } },
      ),
    ).rejects.toThrow(/no transaction hash/i);
  });

  it('rejects a non-positive amount', async () => {
    await expect(
      makeTransfer(
        {
          address: DEPOSIT_ADDRESS,
          amountAtomic: '0',
          decimals: 24,
          chain: 'near',
        },
        { wallet: stubWallet() },
      ),
    ).rejects.toThrow(/must be positive/);
  });

  it('passes signerId through when accountId is supplied', async () => {
    const wallet = stubWallet();

    await makeTransfer(
      {
        address: DEPOSIT_ADDRESS,
        amountAtomic: '1',
        decimals: 24,
        chain: 'near',
      },
      { wallet, accountId: 'alice.near' },
    );

    expect(sentTx(wallet).signerId).toBe('alice.near');
  });
});
