import { PropsWithChildren, ReactElement } from 'react';
import { cn } from '../utils';
import { useTheme } from '../hooks/useTheme';

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
  const containerColor =
    theme?.stylePreset === 'bold' ? 'bg-sw-accent-950' : 'bg-sw-gray-950';

  const jsx = (
    <div
      style={{
        transform: isFullPage ? 'translateY(15dvh)' : 'none',
      }}
      className={cn(
        'w-full h-fit flex flex-col justify-center items-center relative',
        className,
      )}>
      {HeaderComponent && (
        <div className="w-full mb-sw-2xl">{HeaderComponent}</div>
      )}
      {children}
      {FooterComponent && (
        <div
          className={cn('flex flex-col gap-3 items-center w-full mt-sw-2xl', {
            'mb-sw-2xl': isFullPage,
          })}>
          {FooterComponent}
        </div>
      )}
    </div>
  );

  if (!isFullPage) {
    return (
      <div
        className={cn(
          'relative w-auto mx-auto',
          theme?.showContainer
            ? cn(
                'max-w-[496px] sm:w-[496px] p-csw-2xl rounded-sw-lg',
                containerColor,
              )
            : 'max-w-[456px] sm:w-[456px]',
        )}>
        {jsx}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'sm:h-full min-h-screen sm:max-h-screen sm:overflow-auto w-full min-w-full px-sw-lg py-sw-xl sm:py-auto mx-auto flex justify-center sm:fixed sm:top-0 sm:left-0 sm:right-0',
        containerColor,
        className,
      )}>
      <div className="w-full h-fit max-w-[456px] min-w-[270px]">{jsx}</div>
    </div>
  );
};
