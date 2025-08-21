import { SwapQuote } from '@/features/SwapQuote';
import { TokenInput } from '@/features/TokenInput';
import { Button } from '@/components/Button';

import { Wrapper } from './Wrapper';

export const Skeleton = () => (
  <Wrapper>
    <div className="gap-ds-lg relative flex flex-col">
      <TokenInput.Skeleton />
      <TokenInput.Skeleton />
    </div>
    <SwapQuote.Skeleton />
    <Button state="disabled" size="lg" variant="primary">
      Swap
    </Button>
  </Wrapper>
);
