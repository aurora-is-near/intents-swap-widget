import { Banner, Card, TinyNumber } from '@aurora-is-near/intents-swap-widget';
import type { Phase } from '@aurora-is-near/intents-connect';

import { PUSD_DECIMALS } from '../constants';
import { usePolymarketBalance } from '../hooks/usePolymarketBalance';

/** Matches WidgetContainer's own width so the section lines up under the card. */
const SECTION =
  'flex flex-col w-full mx-auto max-w-[456px] gap-sw-lg mt-sw-4xl';

export const PolymarketBalance = ({
  account,
  phase,
}: {
  account: string;
  phase: Phase;
}) => {
  const { data, error, isPending, isValid } = usePolymarketBalance(
    account,
    phase,
  );

  // Nothing useful to say before there is an address to look up.
  if (!isValid) {
    return null;
  }

  return (
    <section className={SECTION}>
      <h2 className="text-sw-label-lg text-sw-gray-100 px-sw-md">
        Polymarket account balance
      </h2>

      {error ? (
        <Banner
          hasBg
          multiline
          variant="error"
          message={`Could not read the balance — ${error.message}`}
        />
      ) : (
        <Card padding="none">
          <div className="px-sw-xl py-sw-lg flex items-center justify-between gap-sw-md">
            <span className="text-sw-body-sm text-sw-gray-400 break-all">
              {account}
            </span>
            {isPending ? (
              <div className="h-[24px] w-[80px] animate-pulse rounded-sw-sm bg-sw-gray-800" />
            ) : (
              <span className="text-sw-value-lg text-sw-gray-100 whitespace-nowrap">
                <TinyNumber
                  value={(data ?? 0n).toString()}
                  decimals={PUSD_DECIMALS}
                />{' '}
                <span className="text-sw-label-md text-sw-gray-400">pUSD</span>
              </span>
            )}
          </div>
        </Card>
      )}
    </section>
  );
};
