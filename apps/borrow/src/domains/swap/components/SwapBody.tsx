import type { SwapConfidentialMode } from '@aurora-is-near/intents-swap-widget';

import { useModeQuotes } from '../hooks/useModeQuotes';
import { SwapLayout } from './SwapLayout';
import { SwapModePanel } from './SwapModePanel';
import { SwapWidget } from './SwapWidget';

type SwapBodyProps = {
  mode: SwapConfidentialMode;
  onModeChange: (mode: SwapConfidentialMode) => void;
};

/**
 * The widget and the panel showing its quotes. Its own chunk, loaded on the
 * client only: the widget's dependencies need the browser.
 */
export function SwapBody({ mode, onModeChange }: SwapBodyProps) {
  const { quotes, isQuoting } = useModeQuotes();

  return (
    <SwapLayout
      mode={mode}
      panel={
        <SwapModePanel
          isQuoting={isQuoting}
          mode={mode}
          onModeChange={onModeChange}
          quotes={quotes}
        />
      }
      widget={<SwapWidget mode={mode} />}
    />
  );
}
