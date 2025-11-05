import { PropsWithChildren } from 'react';

export const TokenInputHeading = ({ children }: PropsWithChildren) => {
  return (
    <div className="border-b border-sw-gray-700 w-full pb-sw-lg text-sw-gray-50">
      {children}
    </div>
  );
};
