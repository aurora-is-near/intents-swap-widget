import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
  useExecution,
  useIntentsConnect,
} from '@aurora-is-near/intents-connect/react';
import {
  Banner,
  TinyNumber,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';

import { Layout } from '../../shared/components/Layout';
import { ALCHEMY_API_KEY } from '../../shared/config';
import { getBuyToken, SOLANA_USDC } from '../constants';
import { buildSolanaPlan } from '../plan';
import { useSolanaBuy } from '../hooks/useSolanaBuy';
import { BalancesList } from './BalancesList';
import { AssetSelect } from './AssetSelect';

export const SolanaTab = ({
  HeaderComponent,
  outputMint,
  onOutputChange,
  onBusyChange,
}: {
  HeaderComponent: ReactElement;
  outputMint: string;
  onOutputChange: (mint: string) => void;
  onBusyChange: (busy: boolean) => void;
}) => {
  const exec = useExecution();
  const { api, wallet } = useIntentsConnect();
  const { ctx } = useUnsafeSnapshot();
  const [isBusy, setIsBusy] = useState(false);
  const [isSpending, setIsSpending] = useState(false);
  const output = getBuyToken(outputMint);
  const inputKey = JSON.stringify([
    wallet?.signingStandard,
    wallet?.getAddress(),
    ctx.sourceToken?.assetId,
    ctx.sourceTokenAmount,
    outputMint,
  ]);

  const { quote, quoteMoved, isCommitted, executePlan } = useSolanaBuy({
    api,
    exec,
    inputKey,
  });

  const hasReview = !!quote && !isCommitted;

  // The tab bar locks while EITHER card is running.
  useEffect(
    () => onBusyChange(isBusy || isSpending),
    [isBusy, isSpending, onBusyChange],
  );

  return (
    <>
      <Layout
        exec={exec}
        HeaderComponent={HeaderComponent}
        alchemyApiKey={ALCHEMY_API_KEY}
        buildPlan={(args) => {
          if (
            args.depositViaWallet &&
            !wallet?.chains.some((chain) => chain === args.token.blockchain)
          ) {
            throw new Error(
              'Connect a wallet for the source chain, or use an external deposit',
            );
          }

          return buildSolanaPlan({ ...args, outputMint });
        }}
        executePlan={executePlan}
        destinationToken={SOLANA_USDC}
        submitLabel={hasReview ? `Buy ${output.symbol}` : 'Get quote'}
        successMessage="Purchase completed in your Connect Solana account"
        inputsKey={outputMint}
        onBusyChange={setIsBusy}
        FieldsComponent={
          <div className="flex flex-col gap-sw-md">
            <AssetSelect
              value={outputMint}
              disabled={isBusy}
              onValueChange={onOutputChange}
            />
            <p className="text-sw-body-sm text-sw-gray-400">
              Bought tokens stay in your Connect Solana account.
            </p>
            {quote && (
              <dl className="flex flex-col gap-sw-sm text-sw-body-sm text-sw-gray-300">
                <div className="flex justify-between gap-sw-md">
                  <dt>Estimated purchase</dt>
                  <dd>
                    <TinyNumber
                      value={quote.estimatedOutput}
                      decimals={output.decimals}
                    />{' '}
                    {output.symbol}
                  </dd>
                </div>
                <div className="flex justify-between gap-sw-md">
                  <dt>Minimum purchase</dt>
                  <dd>
                    <TinyNumber
                      value={quote.minimumOutput}
                      decimals={output.decimals}
                    />{' '}
                    {output.symbol}
                  </dd>
                </div>
                <div className="flex justify-between gap-sw-md">
                  <dt>Connect network fee</dt>
                  <dd>
                    <TinyNumber
                      value={quote.networkFee}
                      decimals={SOLANA_USDC.decimals}
                    />{' '}
                    USDC
                  </dd>
                </div>
                <div className="flex justify-between gap-sw-md">
                  <dt>USD value / other fees</dt>
                  <dd>Unavailable</dd>
                </div>
                {!!quote.route && (
                  <div className="flex justify-between gap-sw-md">
                    <dt>Jupiter route</dt>
                    <dd className="text-right">{quote.route}</dd>
                  </div>
                )}
              </dl>
            )}
            {quoteMoved && (
              <Banner
                hasBg
                multiline
                variant="warn"
                message="The minimum purchase decreased. Review the refreshed quote and press Buy to accept it."
              />
            )}
            {!!exec.executionId && (
              <p className="text-sw-body-sm text-sw-gray-400 break-all">
                Execution: {exec.executionId}
              </p>
            )}
            {!!exec.execution?.transaction?.solanaTxHash && (
              <a
                className="text-sw-body-sm underline text-sw-gray-300"
                target="_blank"
                rel="noreferrer"
                href={`https://explorer.solana.com/tx/${exec.execution.transaction.solanaTxHash}`}>
                View Solana transaction
              </a>
            )}
          </div>
        }
      />
      <BalancesList
        phase={exec.phase}
        isLocked={isBusy}
        onBusyChange={setIsSpending}
      />
    </>
  );
};
