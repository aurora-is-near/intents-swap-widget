import { PropsWithChildren, ReactElement } from 'react';

type WidgetContainerProps = PropsWithChildren<{
  FooterComponent?: ReactElement;
  isFullPage?: boolean;
}>;

export const WidgetContainer = ({
  children,
  FooterComponent,
  isFullPage,
}: WidgetContainerProps) => {
  const jsx = (
    <div className="sw w-full h-full flex flex-col justify-center items-center relative">
      {children}
      {FooterComponent && (
        <div className="flex flex-col gap-3 items-center w-full mt-sw-xl">
          {FooterComponent}
        </div>
      )}
    </div>
  );

  if (!isFullPage) {
    return jsx;
  }

  return (
    <div className="h-full min-h-full w-full min-w-full max-w-[456px] min-w-[270px] px-4 mx-auto flex items-center justify-center fixed top-0 left-0 right-0">
      {jsx}
    </div>
  );
};
