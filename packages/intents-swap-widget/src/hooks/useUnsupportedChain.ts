import { useCallback } from 'react';
import { useUnsafeSnapshot } from '@/machine/snap';
import { fireEvent } from '@/machine/events/utils/fireEvent';

/**
 * Reads the "wallet doesn't support this chain" flag from the machine context.
 * It is set (RPC error 4902) while a chain switch is triggered from within the
 * submit button, so the widget can render a prompt in place of its content.
 */
export const useUnsupportedChain = () => {
  const { ctx } = useUnsafeSnapshot();

  const clearUnsupportedChain = useCallback(() => {
    fireEvent('unsupportedChainSet', null);
  }, []);

  return { unsupportedChain: ctx.unsupportedChain, clearUnsupportedChain };
};
