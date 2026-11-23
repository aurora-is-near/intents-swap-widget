import { Button, Card, Text } from '@aurora-is-near/ui-kit';
import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';

import { useConnectWallet } from '../wallet/useConnectWallet';
import { MarketList } from './MarketList';

/**
 * A token picker and amount box stand-in: `.pick` is 188px wide with a 1.5px
 * `bd2` border and radius 14; the amount box beside it is `sf3` with the
 * same border (Web-Borrow-NotConnected.dc.html lines 217–222, 258–264).
 */
function FieldPlaceholder() {
  return (
    <div aria-hidden="true" className="flex items-stretch gap-[8px]">
      <div className="box-border h-[64px] w-[188px] shrink-0 rounded-[14px] border-[1.5px] border-solid border-bd2 bg-sf" />
      <div className="box-border h-[64px] min-w-0 flex-1 rounded-[14px] border-[1.5px] border-solid border-bd2 bg-sf3" />
    </div>
  );
}

/** The three summary tiles (line 368): `sf2`, radius 14, padding 12px 16px. */
const STATS = ['LTV', 'Liquidation', 'Health'] as const;

/**
 * The New loan tab until the loan form exists (decided): the artboard's two
 * columns (lines 213–375), with a placeholder where the form goes and the
 * live market list beside it. The summary tiles stay "—" until the form
 * gives them a loan. Disconnected, the column ends with the working
 * CTA "Connect wallet to borrow on" and the lime "Aave" chip (line 371),
 * which opens the connect modal; connected, the CTA is left out until the
 * form brings its own.
 *
 * Columns: the form card `flex:1 1 460px; max-width:560px`, the markets
 * `flex:1.3 1 520px`, gap 24, wrapping to one column on narrow screens.
 */
export function NewLoanPlaceholder() {
  const { isConnected } = useIntentsConnectWallet();
  const connectWallet = useConnectWallet();

  return (
    <div className="flex flex-wrap items-start gap-[24px]">
      {/* The form card keeps its 22px padding at every width (inline on the
          artboard, so the 640px `.card` rule does not reach it). */}
      <Card
        aria-label="Loan details"
        className="min-w-0 flex-[1_1_460px] p-[22px] max-w-[560px]"
        role="region">
        <Text className="mb-[8px] leading-[normal]" variant="label">
          SUPPLY
        </Text>
        <FieldPlaceholder />
        <div aria-hidden="true" className="my-[18px] h-px bg-bd" />
        <Text className="mb-[8px] leading-[normal]" variant="label">
          BORROW
        </Text>
        <FieldPlaceholder />
      </Card>

      <section aria-label="Markets" className="min-w-0 flex-[1.3_1_520px]">
        {/* The live markets as `.mkc` cards (lines 344–363), for the
            default pair until the form drives it. */}
        <MarketList layout="cards" />
        <dl className="m-0 mt-[16px] grid grid-cols-3 gap-[10px]">
          {STATS.map((label) => (
            <div
              key={label}
              className="rounded-[14px] bg-sf2 px-[16px] py-[12px] leading-[normal]">
              <dt className="text-[12px] text-mut2">{label}</dt>
              <dd className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">
                —
              </dd>
            </div>
          ))}
        </dl>
        {isConnected ? null : (
          // `.cta` (line 371): `.go` with radius 16, gap 10, margin-top 14.
          <Button
            className="mt-[14px] gap-[10px] rounded-[16px]"
            onClick={connectWallet}>
            <span>Connect wallet to borrow on</span>
            {/* The lime market chip (line 372): `accent`, `onlime` text,
                padding 1px 10px, radius 7. A span, not the kit's `Chip`,
                which is a button and cannot sit inside one. */}
            <span className="rounded-[7px] bg-accent px-[10px] py-px text-onlime">
              Aave
            </span>
          </Button>
        )}
      </section>
    </div>
  );
}
