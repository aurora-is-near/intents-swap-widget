import { useConfig } from '../config';
import { DirectionSwitcher } from '@/components/DirectionSwitcher';
import { useUnsafeSnapshot } from '@/machine/snap';
import { fireEvent } from '@/machine';

export const SwapDirectionSwitcher = () => {
  const { ctx } = useUnsafeSnapshot();
  const { lockSwapDirection } = useConfig();

  return (
    <DirectionSwitcher
      isLoading={ctx.quoteStatus === 'pending'}
      isEnabled={!lockSwapDirection && !!(ctx.sourceToken && ctx.targetToken)}
      onClick={() => fireEvent('tokenSelectRotate', null)}
    />
  );
};
