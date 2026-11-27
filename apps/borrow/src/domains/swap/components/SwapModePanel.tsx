import { cn, Skeleton } from '@aurora-is-near/ui-kit';
import { useState } from 'react';
import type { SwapConfidentialMode } from '@aurora-is-near/intents-swap-widget';
import type { ReactNode } from 'react';

import { LockIcon } from './LockIcon';
import type { ModeQuotes } from '../hooks/useModeQuotes';

type SwapModePanelProps = {
  mode: SwapConfidentialMode;
  onModeChange: (mode: SwapConfidentialMode) => void;
  /** Each mode's last quote, from the widget's store (`useModeQuotes`). */
  quotes: ModeQuotes;
  /** The widget is quoting the picked mode. */
  isQuoting: boolean;
};

/** The globe on the Standard pill (line 665). */
function GlobeIcon() {
  return (
    <svg aria-hidden="true" height="14" viewBox="0 0 14 14" width="14">
      <circle
        className="stroke-ink"
        cx="7"
        cy="7"
        fill="none"
        r="5.5"
        strokeWidth="1.5"
      />
      <path
        className="stroke-ink"
        d="M1.5 7h11M7 1.5c2 2 2 9 0 11M7 1.5c-2 2-2 9 0 11"
        fill="none"
        strokeWidth="1.3"
      />
    </svg>
  );
}

/** The crossed eye beside the Confidential value (line 674). */
function EyeOffIcon() {
  return (
    <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24">
      <path
        className="stroke-mut"
        d="M3 12s3.5-6 9-6c1.6 0 3 .5 4.2 1.2M21 12s-3.5 6-9 6c-1.6 0-3-.5-4.2-1.2M4 4l16 16"
        fill="none"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <circle
        className="stroke-mut"
        cx="12"
        cy="12"
        fill="none"
        r="2.6"
        strokeWidth="1.8"
      />
    </svg>
  );
}

/** The open eye beside the Confidential value while it shows (line 675). */
function EyeIcon() {
  return (
    <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24">
      <path
        className="stroke-mut"
        d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"
        fill="none"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <circle
        className="stroke-mut"
        cx="12"
        cy="12"
        fill="none"
        r="2.6"
        strokeWidth="1.8"
      />
    </svg>
  );
}

/** The picked mode's check, or the empty ring of the other (lines 668–669). */
function PickMark({ isPicked }: { isPicked: boolean }) {
  return isPicked ? (
    <svg aria-hidden="true" height="26" viewBox="0 0 26 26" width="26">
      <circle className="fill-badge" cx="13" cy="13" r="13" />
      <path
        className="stroke-accent"
        d="M7.5 13.3l3.7 3.7 7.3-7.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  ) : (
    <svg aria-hidden="true" height="26" viewBox="0 0 26 26" width="26">
      <circle
        className="stroke-mid"
        cx="13"
        cy="13"
        fill="none"
        r="12"
        strokeWidth="2"
      />
    </svg>
  );
}

type ModeCardProps = {
  name: string;
  description: string;
  icon: ReactNode;
  quote: string | undefined;
  isPicked: boolean;
  isQuoting: boolean;
  onPick: () => void;
  /** The eye beside the value; none for a mode with nothing to hide. */
  valueToggle?: ReactNode;
};

/**
 * One `.mode` card (lines 58–60, 660–680): the mode's pill and pick mark,
 * its last quote and what the mode means. The picked card has the 2.5px ink
 * border on `tint`, its padding trimmed to keep the size. The pick button
 * stretches over the whole card, so a click anywhere picks the mode, while
 * the value's eye toggle, a button of its own, sits above it.
 */
function ModeCard({
  name,
  description,
  icon,
  quote,
  isPicked,
  isQuoting,
  onPick,
  valueToggle,
}: ModeCardProps) {
  const isLoading = isPicked && isQuoting;

  return (
    <div
      aria-busy={isLoading}
      className={cn(
        'relative box-border rounded-20 border-solid font-sans leading-font text-ink',
        isPicked
          ? 'border-2.5 border-ink bg-tint px-[18.5px] py-[16.5px]'
          : 'border-1.5 border-bd bg-sf px-5 py-4.5 hover:border-mid',
      )}>
      <div className="flex items-center justify-between gap-2.5">
        <button
          aria-pressed={isPicked}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border-1.5 border-solid border-bd2 bg-sf px-3.5 py-1.5 font-sans text-15 font-bold leading-font text-ink outline-none after:absolute after:inset-0 after:rounded-20 after:content-[''] focus-visible:after:outline-3 focus-visible:after:outline-offset-4 focus-visible:after:outline-ink focus-visible:after:outline-solid"
          onClick={onPick}
          type="button">
          {icon}
          {name}
        </button>
        <PickMark isPicked={isPicked} />
      </div>
      <div className="mt-5.5 mb-3.5 flex min-h-8 items-center justify-between gap-2.5">
        {isLoading ? (
          <Skeleton className="bg-limebd/60" height={32} width={180} />
        ) : (
          <span className="min-w-0 truncate text-26 font-extrabold tracking-title">
            {quote ?? '—'}
          </span>
        )}
        {valueToggle}
      </div>
      <p className="m-0 text-15 leading-1.4 text-mut">{description}</p>
    </div>
  );
}

type ValueToggleProps = {
  isHidden: boolean;
  onToggle: () => void;
};

/**
 * The eye beside the Confidential value (line 674): crossed while the value
 * is hidden, open while it shows. Above the card's pick button, so it only
 * toggles.
 */
function ValueToggle({ isHidden, onToggle }: ValueToggleProps) {
  return (
    <button
      aria-label={
        isHidden ? 'Show the confidential quote' : 'Hide the confidential quote'
      }
      className="relative z-1 -m-2 inline-flex cursor-pointer rounded-12 border-0 bg-transparent p-2 hover:bg-limebd/60 focus-visible:outline-3 focus-visible:outline-ink focus-visible:outline-solid"
      onClick={onToggle}
      type="button">
      {isHidden ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

/**
 * The Swap mode panel beside the widget (Web-Swap.dc.html lines 654–683).
 * Picking a mode switches the widget's `confidentialMode`; each card shows
 * the quote the widget last fetched in its mode.
 */
export function SwapModePanel({
  mode,
  onModeChange,
  quotes,
  isQuoting,
}: SwapModePanelProps) {
  // Hidden as drawn (line 1207), until the eye shows it.
  const [isConfidentialHidden, setIsConfidentialHidden] = useState(true);

  return (
    <section className="mt-5.5 box-border max-w-140 min-w-0 flex-[1_1_440px] rounded-28 border-1.5 border-solid border-bd bg-sf p-6.5 font-sans leading-font text-ink mobile:mt-0">
      <h2 className="m-0 text-26 font-extrabold tracking-title">Swap mode</h2>
      <p className="mt-2 mb-4.5 text-16 leading-1.45 text-mut">
        Pick how this swap is routed. Confidential obfuscates the origin wallet
        and asset. Standard swaps are publicly visible.
      </p>
      <div className="flex flex-col gap-3">
        <ModeCard
          description="Origin wallet and routing obscured · destination stays public"
          icon={<LockIcon />}
          isPicked={mode === 'confidential'}
          isQuoting={isQuoting}
          name="Confidential"
          onPick={() => onModeChange('confidential')}
          quote={
            isConfidentialHidden && quotes.confidential
              ? 'Hidden'
              : quotes.confidential
          }
          valueToggle={
            <ValueToggle
              isHidden={isConfidentialHidden}
              onToggle={() => setIsConfidentialHidden((hidden) => !hidden)}
            />
          }
        />
        <ModeCard
          description="Fully public settlement, end to end"
          icon={<GlobeIcon />}
          isPicked={mode === 'public'}
          isQuoting={isQuoting}
          name="Standard"
          onPick={() => onModeChange('public')}
          quote={quotes.public}
        />
      </div>
      <p className="mt-4 mb-0 text-13 text-mut2">Quotes are illustrative.</p>
    </section>
  );
}
