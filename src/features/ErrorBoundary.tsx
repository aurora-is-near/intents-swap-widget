import { ErrorBoundary as ErrorBoundaryBase } from 'react-error-boundary';
import type { FallbackProps } from 'react-error-boundary';
import type { PropsWithChildren } from 'react';

import { WidgetError } from '@/errors';
import { useUnsafeSnapshot } from '@/machine/snap';
import type { Context } from '@/machine/context';

type Meta = Record<string, unknown>;

const PassthroughFallback = (_: FallbackProps) => null;

const enrichAndRethrow = (ctx: Context) => {
  return (error: unknown) => {
    if (error instanceof WidgetError) {
      throw error; // already has context attached
    }

    const widgetError = new WidgetError(
      error instanceof Error ? error.message : 'Unknown error',
      { cause: error },
    );

    widgetError.context = ctx;
    throw widgetError;
  };
};

type Props = PropsWithChildren<{
  getMeta?: () => Meta;
}>;

export const ErrorBoundary = ({ children }: Props) => {
  const { ctx } = useUnsafeSnapshot();

  return (
    <ErrorBoundaryBase
      FallbackComponent={PassthroughFallback}
      onError={enrichAndRethrow(ctx)}>
      {children}
    </ErrorBoundaryBase>
  );
};
