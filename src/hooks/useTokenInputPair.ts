import { notReachable } from '@/utils/notReachable';
import { calculatePairAmount } from '@/utils/tokens/calculatePairAmount';
import { formatHumanToBig } from '@/utils/formatters/formatHumanToBig';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import type { Token } from '@/types/token';

import { fireEvent } from '../machine';
import { useUnsafeSnapshot } from '../machine/snap';

export const useTokenInputPair = () => {
  const { ctx } = useUnsafeSnapshot();

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

        break;
      default:
        notReachable(input, { throwError: false });
    }
  };

  const onChangeToken = (input: 'source' | 'target', token: Token) => {
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
          fireEvent('tokenSetAmount', {
            variant: 'source',
            amount: calculatePairAmount(
              formatBigToHuman(ctx.targetTokenAmount, ctx.targetToken.decimals),
              ctx.sourceToken,
              token,
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
          fireEvent('tokenSetAmount', {
            variant: 'target',
            amount: calculatePairAmount(
              formatBigToHuman(ctx.sourceTokenAmount, ctx.sourceToken.decimals),
              ctx.sourceToken,
              token,
            ),
          });
        }

        break;
      default:
        notReachable(input, { throwError: false });
    }
  };

  return { onChangeAmount, onChangeToken };
};
