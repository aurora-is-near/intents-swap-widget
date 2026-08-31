import { describe, expect, it, vi } from 'vitest';

import { makeTransfer } from '@/evm/makeTransfer';

const FROM = '0xD84368a36ff4F6285F4121ED75E8c1f237E51506';
const DEPOSIT = '0x1111111111111111111111111111111111111111';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = 8453;

type Call = { method: string; params?: unknown };

/** Minimal EIP-1193 stub that records every RPC call viem makes. */
const stubProvider = (initialChainId = BASE_CHAIN_ID) => {
  const calls: Call[] = [];
  // A real wallet reports the new chain after a successful switch, and viem
  // asserts the current chain before sending.
  let chainId = initialChainId;

  const request = vi.fn(async ({ method, params }: Call) => {
    calls.push({ method, params });

    switch (method) {
      case 'wallet_switchEthereumChain': {
        const [{ chainId: hex }] = params as [{ chainId: string }];

        chainId = Number.parseInt(hex, 16);

        return null;
      }

      case 'eth_chainId':
        return `0x${chainId.toString(16)}`;
      case 'eth_accounts':
      case 'eth_requestAccounts':
        return [FROM];
      case 'eth_sendTransaction':
        return '0xtxhash';
      default:
        return null;
    }
  });

  return { provider: { request }, calls };
};

const sentTx = (calls: Call[]) =>
  (
    calls.find((c) => c.method === 'eth_sendTransaction')?.params as
      | [Record<string, string>]
      | undefined
  )?.[0];

describe('ERC-20 deposit', () => {
  it('sends a transfer() to the token contract with the deposit address encoded', async () => {
    const { provider, calls } = stubProvider();

    const result = await makeTransfer(
      {
        address: DEPOSIT,
        amountAtomic: '87125',
        decimals: 6,
        tokenAddress: USDC,
        chain: 'base',
        evmChainId: BASE_CHAIN_ID,
        isNativeEvmTokenTransfer: false,
      },
      { provider },
    );

    expect(result).toEqual({ hash: '0xtxhash' });

    const tx = sentTx(calls);

    expect(tx?.to?.toLowerCase()).toBe(USDC.toLowerCase());
    // transfer(address,uint256) selector, then the padded recipient and amount.
    expect(tx?.data?.startsWith('0xa9059cbb')).toBe(true);
    expect(tx?.data?.toLowerCase()).toContain(DEPOSIT.slice(2).toLowerCase());
    expect(BigInt(`0x${tx?.data?.slice(-64)}`)).toBe(87125n);
  });
});

describe('native deposit', () => {
  it('sends value directly to the deposit address with no calldata', async () => {
    const { provider, calls } = stubProvider();

    await makeTransfer(
      {
        address: DEPOSIT,
        amountAtomic: '1000000000000000',
        decimals: 18,
        chain: 'base',
        evmChainId: BASE_CHAIN_ID,
        isNativeEvmTokenTransfer: true,
      },
      { provider },
    );

    const tx = sentTx(calls);

    expect(tx?.to?.toLowerCase()).toBe(DEPOSIT.toLowerCase());
    expect(BigInt(tx?.value ?? '0x0')).toBe(1000000000000000n);
    expect(tx?.data).toBeUndefined();
  });
});

describe('network handling', () => {
  it('requests a chain switch when the wallet is on the wrong network', async () => {
    const { provider, calls } = stubProvider(1);

    await makeTransfer(
      {
        address: DEPOSIT,
        amountAtomic: '1',
        decimals: 6,
        tokenAddress: USDC,
        chain: 'base',
        evmChainId: BASE_CHAIN_ID,
      },
      { provider },
    );

    expect(calls).toEqual(
      expect.arrayContaining([
        {
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }],
        },
      ]),
    );
  });

  it('does not switch when already on the right network', async () => {
    const { provider, calls } = stubProvider();

    await makeTransfer(
      {
        address: DEPOSIT,
        amountAtomic: '1',
        decimals: 6,
        tokenAddress: USDC,
        chain: 'base',
        evmChainId: BASE_CHAIN_ID,
      },
      { provider },
    );

    expect(calls.some((c) => c.method === 'wallet_switchEthereumChain')).toBe(
      false,
    );
  });
});

describe('validation', () => {
  it('rejects a non-EVM deposit address', async () => {
    const { provider } = stubProvider();

    await expect(
      makeTransfer(
        {
          address: 'not-an-address',
          amountAtomic: '1',
          decimals: 6,
          tokenAddress: USDC,
          chain: 'base',
          evmChainId: BASE_CHAIN_ID,
        },
        { provider },
      ),
    ).rejects.toThrow(/Invalid EVM address/);
  });

  it('requires an evmChainId', async () => {
    const { provider } = stubProvider();

    await expect(
      makeTransfer(
        {
          address: DEPOSIT,
          amountAtomic: '1',
          decimals: 6,
          tokenAddress: USDC,
          chain: 'base',
        },
        { provider },
      ),
    ).rejects.toThrow(/chain ID is required/);
  });

  it('accepts a NEAR deposit address for a virtual-chain origin', async () => {
    // Aurora withdrawals target a NEAR account, so the EVM address check must
    // not apply there.
    const { provider, calls } = stubProvider();

    await makeTransfer(
      {
        address: 'deposit-1click.near',
        amountAtomic: '5',
        decimals: 6,
        tokenAddress: USDC,
        chain: 'aurora',
        evmChainId: 1313161554,
      },
      { provider },
    );

    // withdrawToNear(bytes,uint256)
    expect(sentTx(calls)?.data?.startsWith('0x6b351848')).toBe(true);
  });
});
