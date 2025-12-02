import type { PropsWithChildren } from 'react';

export const WidgetPageContainer = ({ children }: PropsWithChildren) => (
  <div className="w-full flex items-center justify-center translate-y-[20dvh] bg-sw-gray-950">
    <div className="w-full max-w-[456px] min-w-[270px] py-[32px] px-[16px]">
      {children}
    </div>
  </div>
);
