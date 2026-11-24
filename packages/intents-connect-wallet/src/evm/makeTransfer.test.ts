import { TransactionExecutionError } from 'viem';
import { describe, expect, it, vi } from 'vitest';

import { makeTransfer } from '@/evm/makeTransfer';

const FROM = '0xD84368a36ff4F6285F4121ED75E8c1f237E51506';
const DEPOSIT = '0x1111111111111111111111111111111111111111';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = 8453;

type Call = { method: string; params?: unknown };

/**
 * Scripts one RPC method: gets the call's params and its index among calls to
 * the same method (0 for the first), and returns the result or throws the
 * provider error.
 */
type Script = Record<string, (params: unknown, nth: number) => unknown>;

/** Minimal EIP-1193 stub that records every RPC call viem makes. */
const stubProvider = (initialChainId = BASE_CHAIN_ID, script: Script = {}) => {
  const calls: Call[] = [];
  const counts = new Map<string, number>();
  // A real wallet reports the new chain after a successful switch, and viem
  // asserts the current chain before sending.
  let chainId = initialChainId;

  const request = vi.fn(async ({ method, params }: Call) => {
    calls.push({ method, params });

    const nth = counts.get(method) ?? 0;

    counts.set(method, nth + 1);

    const scripted = script[method];

    if (scripted) {
      return scripted(params, nth);
    }

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

const GNOSIS_CHAIN_ID = 100;
const GNOSIS_WETH = '0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1';

/** WETH on Gnosis → a deposit address: the transfer from the bug report. */
const gnosisWethArgs = {
  address: DEPOSIT,
  amountAtomic: '3000000000000000',
  decimals: 18,
  tokenAddress: GNOSIS_WETH,
  chain: 'gnosis',
  evmChainId: GNOSIS_CHAIN_ID,
  isNativeEvmTokenTransfer: false,
};

const providerError = (code: number, message: string) => ({ code, message });

const unauthorized = () => providerError(4100, 'Unauthorized');

const userRejected = () => providerError(4001, 'User rejected the request.');

/** Every `code` along an error's `cause` chain, as the runner would find it. */
const codesOf = (error: unknown): unknown[] => {
  const codes: unknown[] = [];
  let current = error;

  while (current && typeof current === 'object') {
    if ('code' in current) {
      codes.push(current.code);
    }

    current = 'cause' in current ? current.cause : undefined;
  }

  return codes;
};

const methodsOf = (calls: Call[]) => calls.map((c) => c.method);

const countOf = (calls: Call[], method: string) =>
  calls.filter((c) => c.method === method).length;

const rejectionOf = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  throw new Error('expected the transfer to reject');
};

describe('after a chain switch', () => {
  it('re-reads the chain and the account before sending', async () => {
    const { provider, calls } = stubProvider(BASE_CHAIN_ID);

    await makeTransfer(gnosisWethArgs, { provider });

    const methods = methodsOf(calls);
    const switchAt = methods.indexOf('wallet_switchEthereumChain');
    const sendAt = methods.indexOf('eth_sendTransaction');

    expect(switchAt).toBeGreaterThanOrEqual(0);
    expect(methods.slice(switchAt + 1, sendAt)).toEqual(
      expect.arrayContaining(['eth_chainId', 'eth_accounts']),
    );
  });

  it('waits for a switch the wallet has not applied yet', async () => {
    const { provider } = stubProvider(BASE_CHAIN_ID, {
      // The first read decides to switch; the wallet then still reports Base
      // twice before it lands on Gnosis.
      eth_chainId: (_, nth) =>
        `0x${(nth < 3 ? BASE_CHAIN_ID : GNOSIS_CHAIN_ID).toString(16)}`,
    });

    await expect(makeTransfer(gnosisWethArgs, { provider })).resolves.toEqual({
      hash: '0xtxhash',
    });
  });

  it('rejects without sending when the wallet never reaches the chain', async () => {
    const { provider, calls } = stubProvider(BASE_CHAIN_ID, {
      eth_chainId: () => `0x${BASE_CHAIN_ID.toString(16)}`,
    });

    await expect(makeTransfer(gnosisWethArgs, { provider })).rejects.toThrow(
      /switch to the correct network \(Chain ID: 100\)/,
    );
    expect(countOf(calls, 'eth_sendTransaction')).toBe(0);
  });

  it('asks for accounts before sending when the wallet exposes none on the new chain', async () => {
    let granted = false;

    const { provider, calls } = stubProvider(BASE_CHAIN_ID, {
      eth_accounts: () => (granted ? [FROM] : []),
      eth_requestAccounts: () => {
        granted = true;

        return [FROM];
      },
    });

    await makeTransfer(gnosisWethArgs, { provider });

    const methods = methodsOf(calls);

    expect(methods.indexOf('eth_requestAccounts')).toBeGreaterThanOrEqual(0);
    expect(methods.indexOf('eth_requestAccounts')).toBeLessThan(
      methods.indexOf('eth_sendTransaction'),
    );
    expect(sentTx(calls)?.from?.toLowerCase()).toBe(FROM.toLowerCase());
  });
});

describe('4100 (site not authorized on the chain)', () => {
  it('requests permissions once and retries the same transfer', async () => {
    const { provider, calls } = stubProvider(BASE_CHAIN_ID, {
      eth_sendTransaction: (_, nth) => {
        if (nth === 0) {
          throw unauthorized();
        }

        return '0xtxhash';
      },
    });

    const result = await makeTransfer(gnosisWethArgs, { provider });

    expect(result).toEqual({ hash: '0xtxhash' });

    const methods = methodsOf(calls);
    const sends = calls.filter((c) => c.method === 'eth_sendTransaction');
    const firstSendAt = methods.indexOf('eth_sendTransaction');
    const permissionsAt = methods.indexOf('wallet_requestPermissions');

    expect(sends).toHaveLength(2);
    expect(sends[1]?.params).toEqual(sends[0]?.params);
    expect(countOf(calls, 'wallet_requestPermissions')).toBe(1);
    expect(permissionsAt).toBeGreaterThan(firstSendAt);
    expect(permissionsAt).toBeLessThan(
      methods.lastIndexOf('eth_sendTransaction'),
    );
    expect(calls[permissionsAt]?.params).toEqual([{ eth_accounts: {} }]);
    // The account is re-read after the grant, before the retry.
    expect(
      methods
        .slice(permissionsAt + 1, methods.lastIndexOf('eth_sendTransaction'))
        .includes('eth_accounts'),
    ).toBe(true);
  });

  it('recovers a native transfer the same way', async () => {
    const { provider, calls } = stubProvider(BASE_CHAIN_ID, {
      eth_sendTransaction: (_, nth) => {
        if (nth === 0) {
          throw unauthorized();
        }

        return '0xtxhash';
      },
    });

    const result = await makeTransfer(
      {
        ...gnosisWethArgs,
        tokenAddress: undefined,
        isNativeEvmTokenTransfer: true,
      },
      { provider },
    );

    expect(result).toEqual({ hash: '0xtxhash' });
    expect(countOf(calls, 'eth_sendTransaction')).toBe(2);
    expect(countOf(calls, 'wallet_requestPermissions')).toBe(1);
  });

  it('recovers a virtual-chain withdrawal the same way', async () => {
    const { provider, calls } = stubProvider(BASE_CHAIN_ID, {
      eth_sendTransaction: (_, nth) => {
        if (nth === 0) {
          throw unauthorized();
        }

        return '0xtxhash';
      },
    });

    const result = await makeTransfer(
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

    expect(result).toEqual({ hash: '0xtxhash' });
    expect(countOf(calls, 'eth_sendTransaction')).toBe(2);
    expect(countOf(calls, 'wallet_requestPermissions')).toBe(1);
  });

  it('rejects with a readable error naming the chain when the retry hits 4100 again', async () => {
    const { provider, calls } = stubProvider(BASE_CHAIN_ID, {
      eth_sendTransaction: () => {
        throw unauthorized();
      },
    });

    const error = await rejectionOf(makeTransfer(gnosisWethArgs, { provider }));

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "Your wallet hasn't authorized this site on Gnosis — reconnect and try again",
    );
    // The original viem error rides along as the cause.
    expect((error as Error).cause).toBeInstanceOf(TransactionExecutionError);
    expect(codesOf((error as Error).cause)).toContain(4100);
    expect(countOf(calls, 'eth_sendTransaction')).toBe(2);
    expect(countOf(calls, 'wallet_requestPermissions')).toBe(1);
  });

  it('falls back to the chain ID when viem does not know the chain', async () => {
    const { provider } = stubProvider(BASE_CHAIN_ID, {
      eth_sendTransaction: () => {
        throw unauthorized();
      },
    });

    await expect(
      makeTransfer({ ...gnosisWethArgs, evmChainId: 987654321 }, { provider }),
    ).rejects.toThrow(
      "Your wallet hasn't authorized this site on chain 987654321 — reconnect and try again",
    );
  });

  it('still retries when the wallet does not support wallet_requestPermissions', async () => {
    const { provider, calls } = stubProvider(BASE_CHAIN_ID, {
      eth_sendTransaction: (_, nth) => {
        if (nth === 0) {
          throw unauthorized();
        }

        return '0xtxhash';
      },
      wallet_requestPermissions: () => {
        throw providerError(4200, 'Unsupported method');
      },
    });

    await expect(makeTransfer(gnosisWethArgs, { provider })).resolves.toEqual({
      hash: '0xtxhash',
    });
    expect(countOf(calls, 'eth_sendTransaction')).toBe(2);
  });
});

describe('4001 (user rejected)', () => {
  it('reaches the caller unchanged from the send, with no permission request or retry', async () => {
    const { provider, calls } = stubProvider(BASE_CHAIN_ID, {
      eth_sendTransaction: () => {
        throw userRejected();
      },
    });

    const error = await rejectionOf(makeTransfer(gnosisWethArgs, { provider }));

    expect(error).toBeInstanceOf(TransactionExecutionError);
    expect(codesOf(error)).toContain(4001);
    expect(codesOf(error)).not.toContain(4100);
    expect(countOf(calls, 'eth_sendTransaction')).toBe(1);
    expect(countOf(calls, 'wallet_requestPermissions')).toBe(0);
  });

  it('reaches the caller unchanged from the permission request, with no retry', async () => {
    const { provider, calls } = stubProvider(BASE_CHAIN_ID, {
      eth_sendTransaction: () => {
        throw unauthorized();
      },
      wallet_requestPermissions: () => {
        throw userRejected();
      },
    });

    const error = await rejectionOf(makeTransfer(gnosisWethArgs, { provider }));

    expect(codesOf(error)).toContain(4001);
    expect((error as Error).message).not.toMatch(/hasn't authorized/);
    expect(countOf(calls, 'eth_sendTransaction')).toBe(1);
    expect(countOf(calls, 'wallet_requestPermissions')).toBe(1);
  });
});

describe('provider identity', () => {
  const withDecoyEthereum = async (run: () => Promise<void>) => {
    const decoy = { request: vi.fn(async () => null) };
    const global = globalThis as { ethereum?: unknown };
    const previous = global.ethereum;

    global.ethereum = decoy;

    try {
      await run();
    } finally {
      global.ethereum = previous;
    }

    return decoy;
  };

  it('sends through the provider object it is given, never a global injected one', async () => {
    const { provider, calls } = stubProvider(BASE_CHAIN_ID);

    const decoy = await withDecoyEthereum(async () => {
      await makeTransfer(gnosisWethArgs, { provider });
    });

    expect(countOf(calls, 'eth_sendTransaction')).toBe(1);
    expect(decoy.request).not.toHaveBeenCalled();
  });

  it('sends through the provider an async getter resolves, never a global injected one', async () => {
    const { provider, calls } = stubProvider(BASE_CHAIN_ID, {
      eth_sendTransaction: (_, nth) => {
        if (nth === 0) {
          throw unauthorized();
        }

        return '0xtxhash';
      },
    });

    const decoy = await withDecoyEthereum(async () => {
      await makeTransfer(gnosisWethArgs, {
        provider: () => Promise.resolve(provider),
      });
    });

    // Both sends and the permission request went to the given provider.
    expect(countOf(calls, 'eth_sendTransaction')).toBe(2);
    expect(countOf(calls, 'wallet_requestPermissions')).toBe(1);
    expect(decoy.request).not.toHaveBeenCalled();
  });
});
