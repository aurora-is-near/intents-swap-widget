import type { PropsWithChildren } from 'react';

export const Wrapper = ({ children }: PropsWithChildren) => (
  <div className="gap-sw-2xl flex flex-col">{children}</div>
);
