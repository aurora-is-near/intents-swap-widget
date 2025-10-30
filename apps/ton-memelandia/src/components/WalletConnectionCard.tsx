import { TonConnectButton } from '@tonconnect/ui-react';
import { ReactNode } from 'react';
import { Card } from '@aurora-is-near/intents-swap-widget';
import { AppKitWalletButton } from './AppKitWalletButton';
import { TonWalletButton } from './TonWalletButton';

const STEPS: {
  text: string;
  action?: ReactNode;
}[] = [
  {
    text: 'Connect source wallet',
    action: <AppKitWalletButton />,
  },
  {
    text: 'Connect TON wallet',
    action: <TonWalletButton />,
  },
  {
    text: 'Swap and receive tokens on TON',
  },
];

export const WalletConnectionCard = () => {
  return (
    <Card padding="none" className="px-5">
      <ul className="divide-y divide-white/10">
        {STEPS.map((step, index) => (
          <li
            key={step.text}
            className="flex flex-row justify-between items-center w-full text-sm font-medium text-sw-label-m text-sw-gray-50 py-4">
            <div className="flex flex-row items-center">
              <div className="w-7 h-7 rounded-full border border-sw-gray-50/50 flex items-center justify-center mr-2.5">
                {index + 1}
              </div>
              <span>{step.text}</span>
            </div>
            {step.action}
          </li>
        ))}
      </ul>
    </Card>
  );
};
