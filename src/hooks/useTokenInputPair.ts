import { useState } from 'react';

import { notReachable } from '@/utils/notReachable';
import { calculatePairAmount } from '@/utils/tokens/calculatePairAmount';
import { formatHumanToBig } from '@/utils/formatters/formatHumanToBig';
import type { Token } from '@/types/token';

import { fireEvent } from '../machine';
import { useUnsafeSnapshot } from '../machine/snap';

export const useTokenInputPair = () => {
  const { ctx } = useUnsafeSnapshot();
  const [lastChangedInput, setLastChangedInput] = useState<
    'source' | 'target' | undefined
  >(undefined);

  const onChangeAmount = (input: 'source' | 'target', amount: string) => {
    switch (input) {
      case 'source':
        if (!ctx.sourceToken) {
          return;
        }

        fireEvent('tokenSetAmount', {
          variant: 'source',
          amount: formatHumanToBig(amount, ctx.sourceToken.decimals),
        });

        fireEvent('tokenSetAmount', {
          variant: 'target',
          amount: calculatePairAmount(amount, ctx.sourceToken, ctx.targetToken),
        });

        setLastChangedInput('source');
        break;
      case 'target':
        if (!ctx.targetToken) {
          return;
        }

        fireEvent('tokenSetAmount', {
          variant: 'source',
          amount: calculatePairAmount(amount, ctx.targetToken, ctx.sourceToken),
        });

        fireEvent('tokenSetAmount', {
          variant: 'target',
          amount: formatHumanToBig(amount, ctx.targetToken.decimals),
        });

        setLastChangedInput('target');
        break;
      default:
        notReachable(input, { throwError: false });
    }
  };

  const onChangeToken = (input: 'source' | 'target', token: Token) => {
    setLastChangedInput(undefined);

    switch (input) {
      case 'source':
        fireEvent('tokenSelect', {
          variant: 'source',
          token,
        });

        if (!token || !ctx.targetToken) {
          fireEvent('tokenSetAmount', {
            variant: 'source',
            amount: '',
          });
        } else {
          const recalculatedAmount =
            ((parseFloat(ctx.targetTokenAmount) /
              10 ** ctx.targetToken.decimals) *
              ctx.targetToken.price) /
            token.price;

          fireEvent('tokenSetAmount', {
            variant: 'source',
            amount: formatHumanToBig(
              recalculatedAmount.toFixed(5).toString(),
              token.decimals,
            ),
          });
        }

        break;
      case 'target':
        fireEvent('tokenSelect', {
          variant: 'target',
          token,
        });

        if (!token || !ctx.sourceToken) {
          fireEvent('tokenSetAmount', {
            variant: 'target',
            amount: '',
          });
        } else {
          const recalculatedAmount =
            ((parseFloat(ctx.sourceTokenAmount) /
              10 ** ctx.sourceToken.decimals) *
              ctx.sourceToken.price) /
            token.price;

          fireEvent('tokenSetAmount', {
            variant: 'target',
            amount: formatHumanToBig(
              recalculatedAmount.toFixed(5).toString(),
              token.decimals,
            ),
          });
        }

        break;
      default:
        notReachable(input, { throwError: false });
    }
  };

  return { lastChangedInput, onChangeAmount, onChangeToken };
};
