import { ErrorBoundary as ErrorBoundaryBase } from 'react-error-boundary';
import type { FallbackProps } from 'react-error-boundary';
import type { ErrorInfo, PropsWithChildren } from 'react';

import { WidgetError } from '@/errors';
import { useUnsafeSnapshot } from '@/machine/snap';
import type { Context } from '@/machine/context';

type Meta = Record<string, unknown>;

const PassthroughFallback = (_: FallbackProps) => null;

const enrichAndRethrow = (ctx: Context) => {
  return (error: unknown, info: ErrorInfo) => {
    if (error instanceof WidgetError) {
      throw error; // already has context attached
    }

    const enriched =
      error instanceof Error
        ? Object.assign(error, {
            context: ctx,
            __componentStack__: info.componentStack,
          })
        : {
            context: ctx,
            original: error,
            __componentStack__: info.componentStack,
          };

    throw enriched;
  };
};

type Props = PropsWithChildren<{
  getMeta?: () => Meta;
}>;

export const ErrorBoundary = ({ children, getMeta }: Props) => {
  const { ctx } = useUnsafeSnapshot();
  return (
    <ErrorBoundaryBase
      FallbackComponent={PassthroughFallback}
      onError={enrichAndRethrow(ctx)}>
      {children}
    </ErrorBoundaryBase>
  );
};
