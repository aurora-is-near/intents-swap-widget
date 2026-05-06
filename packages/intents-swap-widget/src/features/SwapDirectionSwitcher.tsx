import { DirectionSwitcher } from '@/components/DirectionSwitcher';
import { useUnsafeSnapshot } from '@/machine/snap';
import { fireEvent } from '@/machine';
import { useConfig } from '../config';

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
