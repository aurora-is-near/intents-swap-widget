import clsx from 'clsx';
import * as Icons from 'lucide-react';
import { ReactNode, useMemo } from 'react';
import { TokenAmount } from './TokenAmount';
import { useTokens } from '../hooks';
import { Card } from './Card';
import { cn } from '../utils';

type Props = {
  title?: string;
  state?: 'not-started' | 'in-progress' | 'completed' | 'failed';
  className?: string;
  source: {
    assetId: string;
    amount: string;
  };
  target: {
    assetId: string;
    amount: string;
  };
};

export const SwapCard = ({
  title = 'Swap',
  state,
  className,
  source,
  target,
}: Props) => {
  const { tokens: defaultTokens } = useTokens();
  const { tokens: sourceTokens } = useTokens('source');
  const { tokens: targetTokens } = useTokens('target');

  const mergedTokens = useMemo(() => {
    const tokenMap: Record<string, (typeof defaultTokens)[0]> = {};

    [
      ...defaultTokens,
      ...(sourceTokens || []),
      ...(targetTokens || []),
    ].forEach((token) => {
      tokenMap[token.assetId] = token;
    });

    return Object.values(tokenMap);
  }, [defaultTokens, sourceTokens, targetTokens]);

  const sourceToken = mergedTokens.find(
    (token) => token.assetId === source.assetId,
  );

  const targetToken = mergedTokens.find(
    (token) => token.assetId === target.assetId,
  );

  const statusIndicator:
    | {
        label: string;
        labelClassName?: string;
        icon?: ReactNode;
      }
    | undefined = useMemo(() => {
    if (state === 'in-progress') {
      return {
        label: 'Waiting',
        icon: <Icons.Loader size={16} className="animate-spin" />,
      };
    }

    if (state === 'completed') {
      return {
        label: 'Completed',
        labelClassName: 'text-sw-success-100',
        icon: (
          <div className="rounded-full w-[16px] h-[16px] flex items-center justify-center bg-sw-success-100">
            <Icons.Check size={9} className="text-sw-gray-900" />
          </div>
        ),
      };
    }

    if (state === 'failed') {
      return {
        label: 'Failed',
        labelClassName: 'text-sw-alert-100',
        icon: (
          <div className="rounded-full w-[16px] h-[16px] flex items-center justify-center bg-sw-alert-100">
            <Icons.X size={9} className="text-sw-gray-900" />
          </div>
        ),
      };
    }
  }, [state]);

  return (
    <Card className={clsx('w-full text-sw-gray-50', className)}>
      <div className="flex justify-between">
        <h2 className="font-medium text-sw-label-m">{title}</h2>
        {statusIndicator ? (
          <div className="flex flex-row items-center gap-x-sw-sm">
            {statusIndicator.icon}
            <span
              className={cn(
                'font-medium text-sw-label-m',
                statusIndicator.labelClassName,
              )}>
              {statusIndicator.label}
            </span>
          </div>
        ) : (
          <div />
        )}
      </div>
      <div className="flex flex-row items-center gap-x-sw-2md mt-sw-xl">
        {sourceToken && (
          <TokenAmount token={sourceToken} amount={source.amount} />
        )}
        <Icons.ArrowRight className="text-sw-gray-100" size={16} />
        {targetToken && (
          <TokenAmount token={targetToken} amount={target.amount} />
        )}
      </div>
    </Card>
  );
};
