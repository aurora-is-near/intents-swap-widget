import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { isValidChainAddress } from '@aurora-is-near/intents-swap-widget';

const PROFILE_URL = 'https://gamma-api.polymarket.com/public-profile';

/** `null` means the chain is unknown to the validator, which is not a pass. */
export const isPolygonAddress = (address: string) =>
  isValidChainAddress('pol', address) === true;

/**
 * The Polymarket account (proxy / deposit wallet) behind a signing EOA, from
 * Polymarket's public profile API. `null` when the EOA has no profile yet.
 */
const fetchProxyWallet = async (eoa: string) => {
  const response = await fetch(`${PROFILE_URL}?address=${eoa}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Polymarket profile lookup failed (${response.status})`);
  }

  const profile = (await response.json()) as { proxyWallet?: string | null };

  return profile.proxyWallet && isPolygonAddress(profile.proxyWallet)
    ? profile.proxyWallet
    : null;
};

/**
 * Where the pUSD lands: resolved from the connected wallet, overridable by
 * hand when the lookup finds nothing or picks the wrong account.
 */
export const usePolymarketAccount = (eoa: string | undefined) => {
  const [manual, setManual] = useState<string>();

  // A different wallet means a different Polymarket account.
  useEffect(() => setManual(undefined), [eoa]);

  const lookup = useQuery({
    queryKey: ['polymarket-proxy-wallet', eoa?.toLowerCase()],
    queryFn: () => (eoa ? fetchProxyWallet(eoa) : null),
    enabled: !!eoa,
    staleTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const account = manual ?? lookup.data ?? '';

  return {
    account,
    isValid: isPolygonAddress(account),
    source: manual !== undefined ? ('manual' as const) : ('auto' as const),
    isLoading: lookup.isLoading,
    isNotFound: lookup.isSuccess && lookup.data === null,
    error: lookup.error,
    setManual,
    resetManual: () => setManual(undefined),
  };
};
