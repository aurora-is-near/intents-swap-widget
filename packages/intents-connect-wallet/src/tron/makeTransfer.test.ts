import { isUserRejection } from '@aurora-is-near/intents-connect';
import { describe, expect, it, vi } from 'vitest';

import { makeTransfer, toTronContract } from '@/tron/makeTransfer';
import type { TronTransactionInfo, TronWebLike } from '@/tron/types';

const FROM = 'TNXoiAJ3dct8Fjg4M9fkLFh9S2v9TXc32G';
const DEPOSIT = 'TV6MuMXfmLbBqPZvBHdwFsDnQeVfnmiuSi';
const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const MAINNET_GENESIS =
  '00000000000000001ebf88508a03865c71d452e25f4d51194196a1d22b6653dc';

const fakeTronWeb = ({
  genesis = MAINNET_GENESIS,
  infos = [{}, { blockNumber: 1 }] as TronTransactionInfo[],
  sign = vi.fn(async (tx: { txID: string }) => ({ ...tx, signature: ['s'] })),
}: {
  genesis?: string;
  infos?: TronTransactionInfo[];
  sign?: TronWebLike['trx']['sign'];
} = {}) => {
  const queue = [...infos];

  return {
    defaultAddress: { base58: FROM },
    trx: {
      signMessageV2: vi.fn(),
      sign,
      sendRawTransaction: vi.fn(async () => ({ result: true, txid: 'tx-1' })),
      getTransactionInfo: vi.fn(),
      getUnconfirmedTransactionInfo: vi.fn(async () =>
        queue.length > 1 ? queue.shift()! : queue[0]!,
      ),
      getBlockByNumber: vi.fn(async () => ({ blockID: genesis })),
    },
    transactionBuilder: {
      sendTrx: vi.fn(async () => ({ txID: 'tx-1' })),
      triggerSmartContract: vi.fn(async () => ({
        result: { result: true },
        transaction: { txID: 'tx-1' },
      })),
    },
  } satisfies TronWebLike;
};

const options = (tronWeb: TronWebLike) => ({
  tronWeb,
  pollIntervalMs: 0,
  inclusionTimeoutMs: 1_000,
});

describe('TRON makeTransfer', () => {
  it('sends TRX with sendTrx, then waits for its block', async () => {
    const tronWeb = fakeTronWeb();

    await expect(
      makeTransfer(
        {
          address: DEPOSIT,
          amountAtomic: '25000000',
          decimals: 6,
          chain: 'tron',
        },
        options(tronWeb),
      ),
    ).resolves.toEqual({ hash: 'tx-1' });

    expect(tronWeb.transactionBuilder.sendTrx).toHaveBeenCalledWith(
      DEPOSIT,
      25_000_000,
      FROM,
    );
    expect(tronWeb.trx.getUnconfirmedTransactionInfo).toHaveBeenCalledTimes(2);
  });

  it("sends a TRC-20 with transfer(address,uint256), taking an asset id's hex contract", async () => {
    const tronWeb = fakeTronWeb();

    await makeTransfer(
      {
        address: DEPOSIT,
        amountAtomic: '3000000',
        decimals: 6,
        chain: 'tron',
        tokenAddress: 'a614f803b6fd780986a42c78ec9c7f77e6ded13c',
      },
      options(tronWeb),
    );

    expect(
      tronWeb.transactionBuilder.triggerSmartContract,
    ).toHaveBeenCalledWith(
      '41a614f803b6fd780986a42c78ec9c7f77e6ded13c',
      'transfer(address,uint256)',
      expect.objectContaining({ feeLimit: 100_000_000 }),
      [
        { type: 'address', value: DEPOSIT },
        { type: 'uint256', value: '3000000' },
      ],
      FROM,
    );
    expect(toTronContract(USDT)).toBe(USDT);
  });

  it('fails when the chain reports the TRC-20 call failed', async () => {
    await expect(
      makeTransfer(
        {
          address: DEPOSIT,
          amountAtomic: '3000000',
          decimals: 6,
          chain: 'tron',
          tokenAddress: USDT,
        },
        options(
          fakeTronWeb({
            infos: [{ blockNumber: 1, receipt: { result: 'OUT_OF_ENERGY' } }],
          }),
        ),
      ),
    ).rejects.toThrow(/OUT_OF_ENERGY/);
  });

  it('returns the hash of a broadcast transfer it could not see land', async () => {
    await expect(
      makeTransfer(
        { address: DEPOSIT, amountAtomic: '1', decimals: 6, chain: 'tron' },
        { ...options(fakeTronWeb({ infos: [{}] })), inclusionTimeoutMs: 20 },
      ),
    ).resolves.toEqual({ hash: 'tx-1' });
  });

  it('turns TronLink’s bare-string refusal into a user rejection', async () => {
    const error = await makeTransfer(
      { address: DEPOSIT, amountAtomic: '1', decimals: 6, chain: 'tron' },
      options(
        fakeTronWeb({
          sign: vi.fn(async () => {
            // eslint-disable-next-line no-throw-literal -- TronLink throws a bare string.
            throw 'Confirmation declined by user';
          }),
        }),
      ),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(isUserRejection(error)).toBe(true);
  });

  it('refuses a test network, and a memo, before anything is signed', async () => {
    const testnet = fakeTronWeb({ genesis: `${'0'.repeat(56)}cd8690dc` });

    await expect(
      makeTransfer(
        { address: DEPOSIT, amountAtomic: '1', decimals: 6, chain: 'tron' },
        options(testnet),
      ),
    ).rejects.toThrow(/test network/);
    expect(testnet.trx.sign).not.toHaveBeenCalled();

    await expect(
      makeTransfer(
        {
          address: DEPOSIT,
          amountAtomic: '1',
          decimals: 6,
          chain: 'tron',
          memo: '42',
        },
        options(fakeTronWeb()),
      ),
    ).rejects.toThrow(/no memo/);
  });
});
