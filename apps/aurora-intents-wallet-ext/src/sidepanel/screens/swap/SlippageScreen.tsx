import {
  fireEvent,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import { Screen } from '../../components/Screen';

/** Basis points, as the widget machine stores max slippage. */
const OPTIONS = [50, 100, 200, 300];

/** How far the price may move against a swap before it's refunded instead. */
export const SlippageScreen = ({ onBack }: { onBack: () => void }) => {
  const { ctx } = useUnsafeSnapshot();

  return (
    <Screen title="Swap settings" onBack={onBack}>
      <section className="flex flex-col gap-sw-md">
        <h2 className="px-sw-xs text-sw-label-md text-sw-gray-50">
          Max slippage
        </h2>
        <div
          role="radiogroup"
          aria-label="Max slippage"
          className="flex gap-sw-md">
          {OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={ctx.maxSlippage === value}
              onClick={() => fireEvent('maxSlippageSet', value)}
              className={cn(
                'flex-1 rounded-sw-md py-sw-lg text-sw-label-md',
                ctx.maxSlippage === value
                  ? 'bg-sw-accent-500 text-sw-gray-950'
                  : 'bg-sw-gray-900 text-sw-gray-50 hover:bg-sw-gray-800',
              )}>
              {value / 100}%
            </button>
          ))}
        </div>
        <p className="px-sw-xs text-sw-body-sm text-sw-gray-300">
          If the price moves by more than this before the swap is filled, it
          isn’t filled and the amount is refunded to your account.
        </p>
      </section>
    </Screen>
  );
};
