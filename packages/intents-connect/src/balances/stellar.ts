import { BalanceRpcError } from '@/balances/jsonRpc';
import { isNativeToken } from '@/balances/tokens';
import type { BalanceToken, BalanceTransportOptions } from '@/balances/types';
import type { FetchLike } from '@/http';

const DEFAULT_TIMEOUT = 10_000;
/** Stroops per XLM; every Stellar amount has 7 decimals. */
const STROOPS = 10_000_000n;
/** The base reserve every account entry locks, in stroops (0.5 XLM). */
const BASE_RESERVE = STROOPS / 2n;

type HorizonBalance = {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
  selling_liabilities?: string;
};

type HorizonAccount = {
  balances: HorizonBalance[];
  subentry_count: number;
  num_sponsoring?: number;
  num_sponsored?: number;
};

/** "12.3456789" → stroops. Horizon always answers with 7 decimals. */
const toStroops = (amount: string | undefined): bigint => {
  const [whole = '0', fraction = ''] = (amount ?? '0').split('.');

  return BigInt(whole) * STROOPS + BigInt(fraction.padEnd(7, '0').slice(0, 7));
};

/** The account, `null` when it doesn't exist yet (never funded). */
const fetchAccount = async (
  horizonUrls: readonly string[],
  address: string,
  { fetch: fetchImpl, timeout = DEFAULT_TIMEOUT }: BalanceTransportOptions,
): Promise<HorizonAccount | null> => {
  const doFetch: FetchLike =
    fetchImpl ?? ((input, init) => globalThis.fetch(input, init));

  let lastError = 'no Horizon endpoint configured';

  // eslint-disable-next-line no-restricted-syntax
  for (const base of horizonUrls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await doFetch(
        `${base.replace(/\/$/, '')}/accounts/${encodeURIComponent(address)}`,
        { method: 'GET', signal: controller.signal },
      );

      if (response.status === 404) {
        return null;
      }

      // eslint-disable-next-line no-await-in-loop
      const raw = await response.text();

      if (!response.ok) {
        lastError = `${base} responded ${response.status}`;
      } else {
        return JSON.parse(raw) as HorizonAccount;
      }
    } catch (error) {
      lastError = `${base}: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new BalanceRpcError(`Stellar balances unavailable: ${lastError}`);
};

/**
 * What a Stellar account can spend, from Horizon (`/accounts/{G…}`), in
 * stroops:
 * - XLM: the balance less the minimum the account must keep,
 *   `(2 + subentries + sponsoring − sponsored) × 0.5 XLM`, and its selling
 *   liabilities;
 * - an issued asset (USDC…): its balance on the trustline whose code and
 *   issuer match the token (`contractAddress` is the issuer), less selling
 *   liabilities.
 *
 * An account that doesn't exist yet holds nothing.
 */
export const readStellarBalances = async ({
  address,
  tokens,
  horizonUrls,
  ...transport
}: {
  address: string;
  tokens: readonly BalanceToken[];
  horizonUrls: readonly string[];
} & BalanceTransportOptions): Promise<Record<string, string>> => {
  const account = await fetchAccount(horizonUrls, address, transport);
  const balances: Record<string, string> = {};

  tokens.forEach((token) => {
    if (!account) {
      balances[token.assetId] = '0';

      return;
    }

    if (isNativeToken(token)) {
      const native = account.balances.find(
        (entry) => entry.asset_type === 'native',
      );

      const entries =
        2 +
        account.subentry_count +
        (account.num_sponsoring ?? 0) -
        (account.num_sponsored ?? 0);

      const spendable =
        toStroops(native?.balance) -
        BigInt(entries) * BASE_RESERVE -
        toStroops(native?.selling_liabilities);

      balances[token.assetId] = (spendable > 0n ? spendable : 0n).toString();

      return;
    }

    const line = account.balances.find(
      (entry) =>
        entry.asset_code === token.symbol &&
        entry.asset_issuer === token.contractAddress,
    );

    const spendable =
      toStroops(line?.balance) - toStroops(line?.selling_liabilities);

    balances[token.assetId] = (spendable > 0n ? spendable : 0n).toString();
  });

  return balances;
};
