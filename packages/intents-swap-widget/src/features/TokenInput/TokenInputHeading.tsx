import { PropsWithChildren } from 'react';
import { useConfig } from '../../config';

export const TokenInputHeading = ({ children }: PropsWithChildren) => {
  const { hideTokenInputHeadings } = useConfig();

  if (hideTokenInputHeadings) {
    return null;
  }

  return (
    <div className="border-b border-sw-gray-700 w-full pb-sw-lg text-sw-gray-50">
      {children}
    </div>
  );
};
