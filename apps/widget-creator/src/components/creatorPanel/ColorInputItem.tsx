import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ColorInputItemProps {
  children?: ReactNode;
  onClick: () => void;
  isActive: boolean;
  backgroundColor?: string;
}

export const ColorInputItem = ({
  isActive,
  onClick,
  children,
  backgroundColor,
}: ColorInputItemProps) => {
  return (
    <div
      className={cn(
        'p-csw-md border-[1.5px] flex items-center rounded-csw-md cursor-pointer',
        isActive
          ? 'border-csw-gray-300 bg-csw-gray-800'
          : 'border-csw-gray-700',
      )}
      onClick={onClick}>
      <div
        className="w-[20px] h-[20px] rounded-full"
        style={{ backgroundColor }}>
        {children}
      </div>
    </div>
  );
};
