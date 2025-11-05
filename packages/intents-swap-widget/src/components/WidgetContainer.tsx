import { PropsWithChildren, ReactElement } from 'react';
import { cn } from '../utils';

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
        'h-full min-h-full w-full min-w-full px-sw-lg mx-auto flex items-center justify-center fixed top-0 left-0 right-0',
        className,
      )}>
      <div className="w-full h-full max-w-[456px] min-w-[270px]">{jsx}</div>
    </div>
  );
};
