import isCI from 'is-ci';

import { useUnsafeSnapshot } from '../machine/snap';

export const CtxDebugger = ({ isEnabled = false }: { isEnabled: boolean }) => {
  const { ctx } = useUnsafeSnapshot();

  if (isEnabled && !isCI) {
    console.log('Current context:', {
      ...ctx,
      errorMeta: ctx.error
        ? (ctx.error as unknown as { meta: Record<string, unknown> }).meta
        : undefined,
    });
  }

  return null;
};
