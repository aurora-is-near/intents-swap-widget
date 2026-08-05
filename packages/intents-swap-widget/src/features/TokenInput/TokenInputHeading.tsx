import { PropsWithChildren } from 'react';

export const TokenInputHeading = ({ children }: PropsWithChildren) => {
  return (
    <div className="w-full text-sw-gray-600 text-sw-label-md">{children}</div>
  );
};
