import { useRef } from 'react';
import type { SwapConfidentialMode } from '@aurora-is-near/intents-swap-widget';
import type { CSSProperties, ReactNode } from 'react';

import { useBesidePanelHeight } from '../hooks/useBesidePanelHeight';
import { LockIcon } from './LockIcon';

type SwapLayoutProps = {
  mode: SwapConfidentialMode;
  widget: ReactNode;
  panel: ReactNode;
};

/**
 * The swap card beside the Swap mode panel (Web-Swap.dc.html lines 521–683):
 * they wrap, gap 32, and the card carries the mode chip on its top edge.
 * While they stand side by side, the panel's height is handed to the widget's
 * stylesheet as `--swap-panel-height`: an open token list or history keeps
 * the card no taller than the panel (swapWidget.css).
 */
export function SwapLayout({ mode, widget, panel }: SwapLayoutProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const panelHeight = useBesidePanelHeight(rowRef);

  return (
    <div
      ref={rowRef}
      className="flex flex-wrap items-start justify-center gap-8">
      <div
        className="relative max-w-140 min-w-0 flex-[1_1_480px] pt-5.5"
        style={
          panelHeight === undefined
            ? undefined
            : ({ '--swap-panel-height': `${panelHeight}px` } as CSSProperties)
        }>
        <div className="absolute top-0 left-6.5 z-2 inline-flex items-center gap-2 rounded-full border-1.5 border-solid border-limebd bg-sf px-3.5 py-2 font-sans text-12 font-bold tracking-chip text-ink">
          <LockIcon />
          {mode === 'confidential' ? 'CONFIDENTIAL' : 'STANDARD'}
        </div>
        {widget}
      </div>
      {panel}
    </div>
  );
}
