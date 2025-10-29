import { PropsWithChildren, ReactElement } from 'react';

type WidgetContainerProps = PropsWithChildren<{
  FooterComponent?: ReactElement;
}>;

export const WidgetContainer = ({
  children,
  FooterComponent,
}: WidgetContainerProps) => {
  return (
    <div className="sw w-full h-full flex flex-col justify-center items-center relative">
      {children}
      {FooterComponent && (
        <div className="flex flex-col gap-3 items-center w-full mt-sw-xl">
          {FooterComponent}
        </div>
      )}
    </div>
  );
};
