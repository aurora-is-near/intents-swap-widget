import { PropsWithChildren } from 'react';

export const WidgetContainer = ({ children }: PropsWithChildren) => {
  return (
    <div className="sw w-full h-full flex justify-center items-center">
      {children}
    </div>
  );
};
