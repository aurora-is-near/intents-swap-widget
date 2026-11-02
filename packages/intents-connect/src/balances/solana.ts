import {
  BalanceRpcError,
  jsonRpcBatch,
  type JsonRpcOutcome,
  type JsonRpcRequest,
} from '@/balances/jsonRpc';
import { isNativeToken } from '@/balances/tokens';
import type { BalanceToken, BalanceTransportOptions } from '@/balances/types';

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

type ParsedTokenAccounts = {
  value?: Array<{
    account?: {
      data?: {
        parsed?: {
          info?: { mint?: string; tokenAmount?: { amount?: string } };
        };
      };
    };
  }>;
};

/**
 * One request, endpoint by endpoint, until one ANSWERS it. Unlike a batch,
 * an item-level error also moves on: free Solana endpoints refuse token
 * account queries in-band ("Indexed requests require a personal token") or
 * rate-limit them per method, while the next endpoint may serve them.
 */
const firstAnswer = async (
  rpcUrls: readonly string[],
  request: JsonRpcRequest,
  transport: BalanceTransportOptions,
): Promise<JsonRpcOutcome> => {
  let lastError = 'no RPC endpoint configured';

  // eslint-disable-next-line no-restricted-syntax
  for (const url of rpcUrls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const [outcome] = await jsonRpcBatch([url], [request], transport);

      if (outcome?.ok) {
        return outcome;
      }

      lastError = outcome?.error ?? lastError;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return { ok: false, error: lastError };
};

/**
 * Solana balances in three requests however many tokens: `getBalance` for
 * SOL, and one `getTokenAccountsByOwner` per token program, summing every
 * account of a mint (the widget read only the first account).
 *
 * SPL reads need an endpoint that serves token-account queries — public
 * endpoints mostly do not. SOL is read on its own, so it survives that, and
 * the SPL failure comes back as `partialError`.
 */
export const readSolanaBalances = async ({
  address,
  tokens,
  rpcUrls,
  ...transport
}: {
  address: string;
  tokens: readonly BalanceToken[];
  rpcUrls: readonly string[];
} & BalanceTransportOptions): Promise<{
  balances: Record<string, string>;
  partialError?: Error;
}> => {
  const hasSpl = tokens.some((token) => !isNativeToken(token));

  const [native, ...programs] = await Promise.all([
    firstAnswer(
      rpcUrls,
      { method: 'getBalance', params: [address] },
      transport,
    ),
    ...(hasSpl ? [TOKEN_PROGRAM, TOKEN_2022_PROGRAM] : []).map((programId) =>
      firstAnswer(
        rpcUrls,
        {
          method: 'getTokenAccountsByOwner',
          params: [address, { programId }, { encoding: 'jsonParsed' }],
        },
        transport,
      ),
    ),
  ]);

  const splReadable = hasSpl && programs.every((outcome) => outcome.ok);

  if (!native?.ok && !splReadable) {
    throw new BalanceRpcError(
      `Solana balances failed: ${native?.ok ? '' : native?.error}`,
    );
  }

  const byMint = new Map<string, bigint>();

  programs.forEach((outcome) => {
    if (!outcome.ok) {
      return;
    }

    (outcome.result as ParsedTokenAccounts).value?.forEach((entry) => {
      const info = entry.account?.data?.parsed?.info;

      if (info?.mint && info.tokenAmount?.amount) {
        byMint.set(
          info.mint,
          (byMint.get(info.mint) ?? 0n) + BigInt(info.tokenAmount.amount),
        );
      }
    });
  });

  const balances: Record<string, string> = {};

  tokens.forEach((token) => {
    if (isNativeToken(token)) {
      const value = native?.ok
        ? (native.result as { value?: number }).value
        : undefined;

      if (typeof value === 'number') {
        balances[token.assetId] = String(value);
      }

      return;
    }

    // Without both programs answered, an absent mint might just be unread.
    if (splReadable && token.contractAddress) {
      balances[token.assetId] = (
        byMint.get(token.contractAddress) ?? 0n
      ).toString();
    }
  });

  const failedProgram = programs.find((outcome) => !outcome.ok);

  return {
    balances,
    partialError:
      failedProgram && !failedProgram.ok
        ? new BalanceRpcError(
            `Solana token balances unavailable: ${failedProgram.error}`,
          )
        : undefined,
  };
};
