import { ReactNode } from 'react';

interface ColorInputGroupProps {
  label: string;
  children: ReactNode;
}

export const ColorInputGroup = ({ label, children }: ColorInputGroupProps) => {
  return (
    <div className="space-y-csw-md">
      <div className="flex items-center justify-between">
        <p
          className={`font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200`}>
          {label}
        </p>
        <div className="flex items-center gap-csw-2md">{children}</div>
      </div>
    </div>
  );
};
