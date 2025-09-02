import once from 'lodash.once';
import { useEffect } from 'react';

import { logger } from '@/logger';

import {
  registerGlobalContextSubscription,
  registerGlobalStateSubscription,
} from '@/machine/subscriptions';
import { registerEvents } from '@/machine/events';

import { useSetTokenBalanceEffect } from './useSetTokenBalanceEffect';
import { useWalletConnEffect } from './useWalletConnEffect';
import {
  type Props as PropsMakeQuote,
  useMakeQuoteEffect,
} from './useMakeQuoteEffect';
import {
  type Props as PropsDefaultTokens,
  useSelectedTokensEffect,
} from './useSelectedTokensEffect';
import {
  type Props as PropsAlchemyBalances,
  useAlchemyBalanceEffect,
} from './useAlchemyBalanceEffect';

type EffectMakeQuote = ['makeQuote', Omit<PropsMakeQuote, 'isEnabled'>];

type EffectAlchemyBalances = [
  'setBalancesUsingAlchemyExt',
  Omit<PropsAlchemyBalances, 'isEnabled'>,
];

type EffectDefaultTokens = [
  'setDefaultSelectedTokens',
  Omit<PropsDefaultTokens, 'isEnabled'>,
];

type Effect =
  | 'checkWalletConnection'
  | 'setSourceTokenBalance'
  | EffectMakeQuote
  | EffectDefaultTokens
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

  const defaultTokenListener = listenTo.find<EffectDefaultTokens>(
    (item): item is EffectDefaultTokens =>
      Array.isArray(item) && item[0] === 'setDefaultSelectedTokens',
  );

  const makeQuoteListener = listenTo.find<EffectMakeQuote>(
    (item): item is EffectMakeQuote =>
      Array.isArray(item) && item[0] === 'makeQuote',
  );

  useAlchemyBalanceEffect({
    isEnabled: !!alchemyBalancesListener,
    alchemyApiKey: alchemyBalancesListener?.[1].alchemyApiKey,
  });

  useSelectedTokensEffect({
    isEnabled: !!defaultTokenListener,
    skipIntents: defaultTokenListener?.[1].skipIntents,
    target: defaultTokenListener?.[1].target,
  });

  useMakeQuoteEffect({
    isEnabled: !!makeQuoteListener,
    message: makeQuoteListener?.[1].message,
  });

  useWalletConnEffect({
    isEnabled: listenTo.includes('checkWalletConnection'),
  });

  useSetTokenBalanceEffect({
    isEnabled: listenTo.includes('setSourceTokenBalance'),
  });
};
