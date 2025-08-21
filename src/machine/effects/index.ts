import once from 'lodash.once';
import { useEffect } from 'react';

import { logger } from '@/logger';

import {
  registerGlobalContextSubscription,
  registerGlobalStateSubscription,
} from '@/machine/subscriptions';
import { registerEvents } from '@/machine/events';

import { useSelectedTokensEffect } from './useSelectedTokensEffect';
import { useSetTokenBalanceEffect } from './useSetTokenBalanceEffect';
import { useWalletConnEffect } from './useWalletConnEffect';
import { useMakeQuoteEffect } from './useMakeQuoteEffect';
import {
  type Props as PropsAlchemyBalances,
  useAlchemyBalanceEffect,
} from './useAlchemyBalanceEffect';

type EffectAlchemyBalances = [
  'setBalancesUsingAlchemyExt',
  Omit<PropsAlchemyBalances, 'isEnabled'>,
];

type Effect =
  | 'makeQuote'
  | 'checkWalletConnection'
  | 'setSourceTokenBalance'
  | 'setDefaultSelectedTokens'
  | EffectAlchemyBalances;

type Args = {
  debug?: boolean;
  listenTo: Effect[];
};

export const registerStoreEvents = once(({ debug }: { debug: boolean }) => {
  if (debug) {
    logger.debug('[WIDGET] Debug mode is enabled');
  }

  registerEvents();
  registerGlobalStateSubscription({ debug });
  registerGlobalContextSubscription({ debug });
});

export const useStoreSideEffects = ({ listenTo, debug = false }: Args) => {
  useEffect(() => {
    registerStoreEvents({ debug });
  }, [debug]);

  const alchemyBalancesListener = listenTo.find<EffectAlchemyBalances>(
    (item): item is EffectAlchemyBalances =>
      Array.isArray(item) && item[0] === 'setBalancesUsingAlchemyExt',
  );

  useAlchemyBalanceEffect({
    isEnabled: !!alchemyBalancesListener,
    alchemyApiKey: alchemyBalancesListener?.[1].alchemyApiKey,
  });

  useWalletConnEffect({
    isEnabled: listenTo.includes('checkWalletConnection'),
  });

  useSelectedTokensEffect({
    isEnabled: listenTo.includes('setDefaultSelectedTokens'),
  });

  useSetTokenBalanceEffect({
    isEnabled: listenTo.includes('setSourceTokenBalance'),
  });

  useMakeQuoteEffect({
    isEnabled: listenTo.includes('makeQuote'),
  });
};
