// base components
import { TokenInputWithToken } from './TokenInput';
import { TokenInputEmpty } from './TokenInputEmpty';
import { TokenInputSkeleton } from './TokenInputSkeleton';
import type { Props as PropsBase } from './TokenInput';

// pre-configured presets
import { TokenInputSource } from './TokenInputSource';
import { TokenInputTarget } from './TokenInputTarget';
import { Token } from '@/types/token';

type Props = {
  token?: Token;
} & Omit<PropsBase, 'token'>;

export const TokenInputBase = ({ token, heading, ...props }: Props) => {
  return token ? (
    <TokenInputWithToken {...props} token={token} heading={heading} />
  ) : (
    <TokenInputEmpty onMsg={props.onMsg} heading={heading} />
  );
};

export const TokenInput = Object.assign(TokenInputBase, {
  Skeleton: TokenInputSkeleton,
  Source: TokenInputSource,
  Target: TokenInputTarget,
});
