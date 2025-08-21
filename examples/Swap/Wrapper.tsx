import type { PropsWithChildren } from 'react';

export const Wrapper = ({ children }: PropsWithChildren) => (
  <div className="gap-ds-2xl flex flex-col">{children}</div>
);
