import { Highlight, Skeleton, Text } from '@aurora-is-near/ui-kit';
import { lazy, Suspense, useState } from 'react';
import type { SwapConfidentialMode } from '@aurora-is-near/intents-swap-widget';

import { useHydrated } from '@/utils/useHydrated';

import { SwapLayout } from './SwapLayout';
import { SwapModePanel } from './SwapModePanel';

const SwapBody = lazy(() =>
  import('./SwapBody').then((module) => ({ default: module.SwapBody })),
);

/**
 * The Swap page (Web-Swap.dc.html): the hero, then the swap widget beside
 * the Swap mode panel, which picks the widget's confidential or public route.
 * The prerender and the first client render draw the panel with no quotes
 * and a placeholder for the widget; the widget loads once hydrated.
 */
export function SwapPage() {
  const [mode, setMode] = useState<SwapConfidentialMode>('confidential');
  const isHydrated = useHydrated();

  const placeholder = (
    <SwapLayout
      mode={mode}
      panel={
        <SwapModePanel
          isQuoting={false}
          mode={mode}
          onModeChange={setMode}
          quotes={{}}
        />
      }
      widget={<Skeleton height={520} radius={28} />}
    />
  );

  return (
    <>
      <section className="py-7">
        <Text className="mt-3.5" variant="h64">
          Swap{' '}
          <Highlight>
            {mode === 'confidential' ? 'confidentially' : 'publicly'}
          </Highlight>
        </Text>
        <p className="mt-4 mb-0 max-w-155 text-19/1.45 text-mut">
          Sell any asset, receive any asset. Pick a private or a public route,
          settled from one signed intent.
        </p>
      </section>
      {isHydrated ? (
        <Suspense fallback={placeholder}>
          <SwapBody mode={mode} onModeChange={setMode} />
        </Suspense>
      ) : (
        placeholder
      )}
    </>
  );
}
