import { ArrowRight } from 'lucide-react';
import {
  WidgetSwap,
  WidgetConfigProvider,
} from '@aurora-is-near/intents-swap-widget';
import '@aurora-is-near/intents-swap-widget/styles.css';
import type { Chains } from '@aurora-is-near/intents-swap-widget';

import { DEFAULT_APP_KEY } from '@/constants';

const ALCHEMY_API_KEY = 'CiIIxly0Hi8oQYcQvzgsI';

type PaymentParams = {
  asset: string;
  chain: string;
  amount: string;
  recipient: string;
  description?: string;
};

export const PaymentView = ({
  asset,
  chain,
  amount,
  recipient,
  description,
}: PaymentParams) => {
  return (
    <div className="flex flex-1 items-start justify-center px-csw-2xl py-csw-2xl sm:py-csw-10xl">
      <div className="w-full max-w-[480px] flex flex-col gap-csw-2xl">
        {/* Payment summary card */}
        <div className="bg-csw-gray-950 rounded-csw-lg p-csw-2xl sm:p-csw-3xl flex flex-col gap-csw-xl">
          <h1 className="text-lg font-semibold text-csw-gray-50 tracking-[-0.4px]">
            Payment Request
          </h1>

          {description && (
            <p className="text-sm text-csw-gray-200">{description}</p>
          )}

          <div className="flex flex-col gap-csw-md mt-csw-md">
            <div className="flex items-center justify-between">
              <span className="text-xs text-csw-gray-300">Amount</span>
              <span className="text-sm font-semibold text-csw-gray-50">
                {amount} {asset}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-csw-gray-300">Recipient</span>
              <span className="text-xs text-csw-gray-200 font-mono truncate ml-csw-xl max-w-[280px]">
                {recipient}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-csw-md mt-csw-md text-xs text-csw-gray-300">
            <ArrowRight size={14} />
            <span>
              Select your payment asset below to send{' '}
              <span className="text-csw-gray-100 font-medium">
                {amount} {asset}
              </span>{' '}
              to the recipient.
            </span>
          </div>
        </div>

        {/* Swap widget — only source input visible */}
        <div className="sw payment-widget">
          <style>{`
            .payment-widget [aria-label="Buy"],
            .payment-widget [aria-label="Sell"] ~ .group { display: none; }
          `}</style>
          <WidgetConfigProvider
            config={{
              appName: 'Payment Link',
              apiKey: DEFAULT_APP_KEY,
              connectedWallets: {},
              enableStandaloneMode: true,
              alchemyApiKey: ALCHEMY_API_KEY,
              slippageTolerance: 100,
              defaultTargetToken: { symbol: asset, blockchain: chain as Chains },
              sendAddress: recipient,
              hideSendAddress: true,
              lockSwapDirection: true,
              filterTokens: () => true,
              chainsOrder: [],
            }}>
            <WidgetSwap />
          </WidgetConfigProvider>
        </div>
      </div>
    </div>
  );
};
