import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

type Props = {
  className?: string;
  children: ReactNode | ReactNode[];
};

const NoteItem = ({
  label,
  value,
  isLoading,
}: {
  label: string;
  value?: React.ReactNode;
  isLoading?: boolean;
}) => (
  <li className="flex w-full items-center justify-between">
    <span className="text-sw-label-s text-sw-gray-100">{label}</span>
    {isLoading ? (
      <div className="h-[12px] w-[40px] animate-pulse rounded-full bg-sw-gray-700" />
    ) : (
      <span className="text-sw-label-s text-sw-gray-50">{value ?? '—'}</span>
    )}
  </li>
);

const NotesList = ({ children, className }: Props) => {
  return (
    <ul className={cn('gap-sw-2xl flex flex-col', className)}>{children}</ul>
  );
};

export const Notes = Object.assign(NotesList, {
  Item: NoteItem,
});
