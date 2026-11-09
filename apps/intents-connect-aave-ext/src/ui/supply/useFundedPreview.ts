import { useEffect, useState } from 'react';
import type {
  FundingPreview,
  FundingRequest,
  StepsPreview,
} from '@aurora-is-near/intents-connect';
import {
  type UseExecutionResult,
  useFundingPreview,
} from '@aurora-is-near/intents-connect/react';

import type { DeliverableOption } from './options';
import type { SupplyDestination } from './types';

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

/** Both legs of a supply paid from intents balances, priced together. */
type FundedPreview = {
  funding: FundingPreview;
  steps: StepsPreview;
};

/**
 * A live price of a supply paid from intents (or confidential) balances:
 * a dry quote of the move to the wallet's Aurora account, then a dry run of
 * the supply on what it delivers at least, for the fee and what lands.
 * The last complete pair stays shown while the next one loads; a new
 * request shows nothing until its own arrives.
 */
export const useFundedPreview = ({
  request,
  option,
  exec,
  buildStepsPlan,
  refreshIntervalMs,
}: {
  /** Memoized: a new object is a new quote. */
  request: FundingRequest | null;
  option?: DeliverableOption;
  exec: Pick<UseExecutionResult, 'previewSteps'>;
  buildStepsPlan?: SupplyDestination['buildStepsPlan'];
  refreshIntervalMs: number;
}) => {
  const funding = useFundingPreview({ request, refreshIntervalMs });
  const [steps, setSteps] = useState<{
    funding: FundingPreview;
    preview?: StepsPreview;
    error?: Error;
  }>();

  const [shown, setShown] = useState<FundedPreview>();

  useEffect(() => {
    const priced = funding.preview;

    if (!priced || !option || !buildStepsPlan) {
      return undefined;
    }

    let live = true;

    exec
      .previewSteps(
        buildStepsPlan({
          option,
          destinationAsset: option.destinationAsset,
          amount: priced.minAmountOut,
        }),
      )
      .then(
        (preview) => {
          if (live) {
            setSteps({ funding: priced, preview });
            setShown({ funding: priced, steps: preview });
          }
        },
        (error: unknown) => {
          if (live) {
            setSteps({ funding: priced, error: toError(error) });
          }
        },
      );

    return () => {
      live = false;
    };
    // A new funding price is what re-prices the supply.
  }, [funding.preview]);

  const current = steps?.funding === funding.preview ? steps : undefined;
  const preview = shown?.funding.request === request ? shown : undefined;

  return {
    preview,
    isLoading: funding.isLoading || (!!funding.preview && !current),
    error: funding.error ?? current?.error,
    refresh: funding.refresh,
  };
};
