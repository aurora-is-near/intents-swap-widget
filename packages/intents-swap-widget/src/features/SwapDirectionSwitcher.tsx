import { DirectionSwitcher } from '@/components/DirectionSwitcher';
import { useUnsafeSnapshot } from '@/machine/snap';
import { fireEvent } from '@/machine';
import { useConfig } from '../config';

type Props = {
  isDisabled?: boolean;
};

export const SwapDirectionSwitcher = ({ isDisabled }: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { lockSwapDirection } = useConfig();

  return (
    <DirectionSwitcher
      isLoading={ctx.quoteStatus === 'pending'}
      isEnabled={
        !isDisabled ||
        (!lockSwapDirection && !!(ctx.sourceToken && ctx.targetToken))
      }
      onClick={() => fireEvent('tokenSelectRotate', null)}
    />
  );
};
