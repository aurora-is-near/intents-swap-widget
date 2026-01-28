import { ComponentType, ReactNode } from 'react';
import { cn } from '../utils/cn';

type Props = {
  variant?: 'primary' | 'dark' | 'bright' | 'success';
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  LeadingIcon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  TrailingIcon?: ComponentType<{ className?: string; strokeWidth?: number }>;
} & (
  | { href?: never; target?: never }
  | { href: string; target?: '_blank' | '_self' }
);

const VARIANT_CLASS_NAMES = {
  primary: 'bg-csw-accent-500 hover:bg-csw-accent-400 text-csw-gray-950',
  dark: 'bg-csw-gray-900 hover:bg-csw-gray-800 text-csw-gray-200',
  bright: 'bg-csw-gray-50 hover:bg-csw-gray-100 text-csw-gray-950',
  success: 'bg-csw-status-success/10 text-csw-status-success',
};

const ICON_CLASS_NAMES = 'w-csw-xl h-csw-xl';

export const HeaderButton = ({
  href,
  target,
  onClick,
  variant = 'primary',
  className,
  children,
  LeadingIcon,
  TrailingIcon,
}: Props) => {
  const Component = href ? 'a' : 'button';

  return (
    <Component
      href={href}
      target={target}
      onClick={onClick}
      className={cn(
        'flex flex-row items-center rounded-csw-md px-csw-lg py-csw-2md transition-colors duration-100 font-semibold text-xs tracking-[-0.4px] whitespace-nowrap gap-x-csw-md cursor-pointer',
        VARIANT_CLASS_NAMES[variant],
        className,
      )}>
      {LeadingIcon && (
        <LeadingIcon className={ICON_CLASS_NAMES} strokeWidth={3} />
      )}
      {children}
      {TrailingIcon && (
        <TrailingIcon className={ICON_CLASS_NAMES} strokeWidth={3} />
      )}
    </Component>
  );
};
