import { DirectionSwitcher } from '@/components/DirectionSwitcher';
import { useUnsafeSnapshot } from '@/machine/snap';
import { fireEvent } from '@/machine';

type Props = {
  disabled?: boolean;
};

export const SwapDirectionSwitcher = ({ disabled }: Props) => {
  const { ctx } = useUnsafeSnapshot();

  return (
    <DirectionSwitcher
      isLoading={ctx.quoteStatus === 'pending'}
      isEnabled={!disabled && !!(ctx.sourceToken && ctx.targetToken)}
      onClick={() => fireEvent('tokenSelectRotate', null)}
    />
  );
};
