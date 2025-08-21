import { DirectionSwitcher } from '@/components/DirectionSwitcher';
import { useUnsafeSnapshot } from '@/machine/snap';
import { fireEvent } from '@/machine';

export const SwapDirectionSwitcher = () => {
  const { ctx } = useUnsafeSnapshot();

  return (
    <DirectionSwitcher
      isLoading={ctx.quoteStatus === 'pending'}
      isEnabled={!!(ctx.sourceToken && ctx.targetToken)}
      onClick={() => fireEvent('tokenSelectRotate', null)}
    />
  );
};
