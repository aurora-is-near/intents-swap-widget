import { useEffect, useState } from 'react';
import {
  isUserRejection,
  type OwnershipRejection,
  type ResourceStatus,
  SessionError,
} from '@aurora-is-near/intents-connect';
import { useIntentsAuth } from '@aurora-is-near/intents-connect/react';

import { Button, EmptyState, LockIcon } from '../ui';
import { useConfidentialAssets, useIntentsAssets } from './useIntentsAssets';
import type { AssetRow } from './useWalletAssets';

/** One balance list as the asset picker shows it. */
export type ListState = {
  rows: readonly AssetRow[];
  status: ResourceStatus;
  error?: Error;
  refresh: () => Promise<unknown>;
};

/** Hands a list's state up whenever what it shows changes. */
const useReport = (state: ListState, onState: (state: ListState) => void) => {
  const { rows, status, error } = state;

  useEffect(() => {
    onState(state);
    // `refresh` and `onState` may be new each render; the data decides.
  }, [rows, status, error]);
};

/**
 * Public intents balances, read only while their tab shows: the picker
 * renders one source at a time, and its layout (search, tabs) stays put.
 */
export const IntentsSource = ({
  onState,
}: {
  onState: (state: ListState) => void;
}) => {
  useReport(useIntentsAssets(), onState);

  return null;
};

/** Confidential balances: nothing is read before the user authorizes. */
export const ConfidentialSource = ({
  onState,
}: {
  onState: (state: ListState) => void;
}) => {
  useReport(useConfidentialAssets(), onState);

  return null;
};

const VERDICT_COPY: Record<OwnershipRejection, string> = {
  SIGNATURE_REJECTED: "NEAR Intents didn't accept the signature. Try again.",
  NONCE_REJECTED: 'The signature went stale. Try again.',
  PUBLIC_KEY_NOT_REGISTERED:
    "This NEAR account hasn't registered its key with NEAR Intents yet, so it can't sign for its intents account.",
};

const SESSION_COPY: Partial<Record<SessionError['code'], string>> = {
  CLOCK_SKEW:
    "Your device's clock is off. Set it to update automatically, then try again.",
  UNSUPPORTED_STANDARD:
    "Private balances aren't available for this wallet yet.",
  SIGNATURE_REJECTED: "The signature wasn't accepted. Try again.",
};

/** Why authorizing didn't work, in words the user can act on. */
const authorizeProblem = (error: unknown): string => {
  if (isUserRejection(error)) {
    return 'You declined in your wallet.';
  }

  if (error instanceof SessionError && SESSION_COPY[error.code]) {
    return SESSION_COPY[error.code]!;
  }

  return `Couldn't authorize: ${error instanceof Error ? error.message : String(error)}`;
};

/**
 * Confidential balances stay hidden until the user opens a session: one
 * signature, which moves nothing. The session lives in this page's memory,
 * so a reload asks again.
 */
export const AuthorizeGate = ({ expired }: { expired: boolean }) => {
  const auth = useIntentsAuth();
  const [problem, setProblem] = useState<string>();
  const authorizing = auth.status === 'authorizing';

  return (
    <EmptyState
      icon={<LockIcon size={18} />}
      action={
        <div className="mt-1 flex w-full flex-col items-center gap-2">
          <Button
            variant="primary"
            aria-busy={authorizing}
            onClick={() => {
              if (authorizing) {
                return;
              }

              setProblem(undefined);
              auth.authorize({ verify: true }).then(
                ({ verdict }) => {
                  if (verdict && !verdict.ok) {
                    setProblem(VERDICT_COPY[verdict.reason]);
                  }
                },
                (error: unknown) => setProblem(authorizeProblem(error)),
              );
            }}>
            {authorizing ? 'Sign in your wallet…' : 'Authorize'}
          </Button>
          {problem ? (
            <p role="alert" className="text-danger">
              {problem}
            </p>
          ) : null}
        </div>
      }>
      <span className="block font-medium text-text-primary">
        {expired ? 'Your session expired' : 'Private balances are hidden'}
      </span>
      <span className="mt-1 block">
        Authorize to see them: one signature, which moves no funds.
      </span>
    </EmptyState>
  );
};
