import clsx from 'clsx';
import { ReactNode } from 'react';

type HeadingProps = {
  className?: string;
  children: ReactNode;
};

export const Heading = ({ children, className }: HeadingProps) => (
  <h1
    className={clsx(
      'text-white font-bold tracking-[-0.5px] text-2xl',
      className,
    )}>
    {children}
  </h1>
);
