import { PropsWithChildren, ReactElement } from 'react';
import { cn } from '../utils';
import { useTheme } from '../hooks/useTheme';

const DEFAULT_BACKGROUND_COLOR = '#24262d';

export type WidgetContainerProps = PropsWithChildren<{
  HeaderComponent?: ReactElement | false | null;
  FooterComponent?: ReactElement | false | null;
  isFullPage?: boolean;
  className?: string;
}>;

export const WidgetContainer = ({
  children,
  HeaderComponent,
  FooterComponent,
  isFullPage,
  className,
}: WidgetContainerProps) => {
  const theme = useTheme();

  const jsx = (
    <div
      className={cn(
        'w-full h-full flex flex-col justify-center items-center relative',
        isFullPage && className,
      )}>
      {HeaderComponent && (
        <div className="w-full mb-sw-2xl">{HeaderComponent}</div>
      )}
      {children}
      {FooterComponent && (
        <div className="flex flex-col gap-3 items-center w-full mt-sw-2xl">
          {FooterComponent}
        </div>
      )}
    </div>
  );

  if (!isFullPage) {
    return jsx;
  }

  return (
    <div
      className={cn(
        'sm:h-full min-h-screen w-full min-w-full px-sw-lg py-sw-xl sm:py-auto mx-auto sm:flex sm:items-center sm:justify-center sm:fixed sm:top-0 sm:left-0 sm:right-0',
        className,
      )}
      style={{
        backgroundColor: theme?.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
      }}>
      <div className="w-full h-full max-w-[456px] min-w-[270px]">{jsx}</div>
    </div>
  );
};
