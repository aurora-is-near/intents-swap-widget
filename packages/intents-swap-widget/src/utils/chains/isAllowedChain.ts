import { Chains } from '../../types';

export const isAllowedChain = ({
  chainId,
  variant,
  allowedChainsList,
  allowedSourceChainsList,
  allowedTargetChainsList,
}: {
  chainId: Chains;
  variant: 'source' | 'target';
  allowedChainsList?: readonly Chains[];
  allowedSourceChainsList?: readonly Chains[];
  allowedTargetChainsList?: readonly Chains[];
}) => {
  if (allowedChainsList && !allowedChainsList.includes(chainId)) {
    return false;
  }

  if (
    variant === 'source' &&
    allowedSourceChainsList &&
    !allowedSourceChainsList.includes(chainId)
  ) {
    return false;
  }

  if (
    variant === 'target' &&
    allowedTargetChainsList &&
    !allowedTargetChainsList.includes(chainId)
  ) {
    return false;
  }

  return true;
};
