import { useCallback, useRef } from 'react';

import { getWalletIntentsAccountId } from '@/account';
import { IntentsConnectError } from '@/errors';
import {
  type FundingPreview,
  previewFunding,
} from '@/funding/fundIntermediary';
import type { FundingRequest } from '@/funding/types';
import { useIntentsAccountContext } from '@/react/accountContext';
import { useIntentsConnect } from '@/react/context';
import { useLiveResult } from '@/react/useLiveResult';

export type UseFundingPreviewOptions = {
  /**
   * What to price, or `null` while the input is incomplete. Memoize it: a new
   * request object is a new quote.
   */
  request: FundingRequest | null | undefined;
  /** Waits this long for the input to settle. Defaults to 500 ms. */
  debounceMs?: number;
  /**
   * Prices the same request again this often while the page is visible;
   * `0` never. Defaults to 30 s.
   */
  refreshIntervalMs?: number;
};

export type UseFundingPreviewResult = {
  /** The latest price of the current request (`previewFunding`). */
  preview?: FundingPreview;
  /** A price for the current request is on its way, debounce included. */
  isLoading: boolean;
  /** Why the last price of the current request failed. */
  error?: Error;
  /** Prices again now. */
  refresh: () => void;
};

/**
 * A live, dry price of a funding from intents (or confidential) balances:
 * what reaches the wallet's intermediary, for the form before
 * `useIntentsFundedFlow().submit`. Nothing is reserved or signed. A
 * confidential request uses the session `useIntentsAuth` opened.
 */
export const useFundingPreview = ({
  request,
  debounceMs = 500,
  refreshIntervalMs = 30_000,
}: UseFundingPreviewOptions): UseFundingPreviewResult => {
  const account = useIntentsAccountContext();
  const connect = useIntentsConnect();
  const latest = useRef({ account, connect });

  latest.current = { account, connect };

  const run = useCallback(async (current: FundingRequest) => {
    const { wallet, api } = latest.current.connect;
    const { session, intentsApi } = latest.current.account;

    if (!wallet) {
      throw new IntentsConnectError('no wallet connected');
    }

    const authorized =
      session.state.status === 'authorized' &&
      session.state.intentsAccountId === getWalletIntentsAccountId(wallet);

    return previewFunding(current, {
      intentsApi,
      connectApi: api,
      wallet,
      withAccessToken: authorized ? session.withAccessToken : undefined,
    });
  }, []);

  const { result, isLoading, error, refresh } = useLiveResult(request, run, {
    debounceMs,
    refreshIntervalMs,
  });

  return { preview: result, isLoading, error, refresh };
};
