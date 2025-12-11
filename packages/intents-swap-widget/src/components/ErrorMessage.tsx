import type { PropsWithChildren } from 'react';

export const ErrorMessage = ({ children }: PropsWithChildren) => (
  <div className="flex items-center justify-center">
    <p className="text-sw-label-sm max-w-[80%] text-center text-sw-status-error">
      {children}
    </p>
  </div>
);
