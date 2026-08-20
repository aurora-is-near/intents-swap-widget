import { DirectionSwitcher } from '@/components/DirectionSwitcher';
import { useUnsafeSnapshot } from '@/machine/snap';
import { fireEvent } from '@/machine';
import { useConfig } from '../config';

type Props = {
  isExternalTxReceived?: boolean;
};

export const SwapDirectionSwitcher = ({ isExternalTxReceived }: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { lockSwapDirection } = useConfig();

  return (
    <DirectionSwitcher
      isLoading={ctx.quoteStatus === 'pending'}
      isEnabled={
        !isExternalTxReceived &&
        !lockSwapDirection &&
        !!ctx.sourceToken &&
        !!ctx.targetToken &&
        (!ctx.isDepositFromExternalWallet ||
          (ctx.isDepositFromExternalWallet && !ctx.targetToken.isIntent))
      }
      onClick={() => fireEvent('tokenSelectRotate', null)}
    />
  );
};
