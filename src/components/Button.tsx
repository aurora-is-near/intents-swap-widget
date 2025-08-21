import { Button as UIButton } from '@headlessui/react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import * as Icons from 'lucide-react';

import { cn } from '@/utils/cn';

type Size = 'md' | 'lg';
type Variant = 'primary' | 'tertiary';
type State = 'default' | 'loading' | 'disabled' | 'active' | 'error';

type Props = {
  size: Size;
  state?: State;
  variant: Variant;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
} & (
  | { icon: LucideIcon; iconPosition?: 'head' | 'tail' }
  | { icon?: never; iconPosition?: never }
);

const styles = {
  icon: 'h-ds-xl w-ds-xl',

  size: (size: Size) => ({
    'px-ds-2xl py-ds-lg': size === 'md',
    'px-ds-3xl py-ds-xl': size === 'lg',
  }),

  state: (state: State) => ({
    'bg-transparent text-mauve-400 ring-1 ring-mauve-700': state === 'disabled',
    'bg-mauve-700 text-mauve-300': state === 'loading',
    'bg-alert-900 text-alert-100': state === 'error',
    'text-mauve-975 bg-mauve-300 hover:bg-mauve-50': [
      'active',
      'default',
    ].includes(state),
  }),

  common: `
    flex w-full items-center justify-center gap-ds-lg
    transition-colors duration-250 ease-in-out
    text-label-m rounded-md
  `,
};

const ButtonChildren = ({
  icon,
  iconPosition,
  children,
  state,
}: Pick<Props, 'icon' | 'iconPosition' | 'children' | 'state'>) => {
  const hasIcon = !!icon;
  const Icon =
    hasIcon && state !== 'loading'
      ? (icon ?? (() => <span />))
      : ({ className, ...lucidProps }: LucideProps) => (
          <Icons.Loader
            className={cn(styles.icon, 'animate-spin', className)}
            {...lucidProps}
          />
        );

  return (
    <>
      {(hasIcon && iconPosition !== 'tail') ||
      (!hasIcon && state === 'loading') ? (
        <Icon className={styles.icon} />
      ) : null}
      {children}
      {hasIcon && iconPosition === 'tail' && <Icon className={styles.icon} />}
    </>
  );
};

const ButtonPrimary = ({
  size,
  className,
  children,
  state = 'default',
  onClick,
  ...props
}: Omit<Props, 'variant'>) => {
  return (
    <UIButton
      onClick={() => state === 'default' && onClick?.()}
      className={cn(
        styles.common,
        styles.size(size),
        styles.state(state),
        { 'cursor-pointer': !['disabled', 'loading', 'error'].includes(state) },
        className,
      )}>
      <ButtonChildren state={state} {...props}>
        {children}
      </ButtonChildren>
    </UIButton>
  );
};

const ButtonTertiary = ({
  size,
  children,
  className,
  state = 'default',
  onClick,
  ...props
}: Omit<Props, 'variant'>) => {
  return (
    <UIButton
      onClick={() => state === 'default' && onClick?.()}
      className={cn(
        styles.common,
        styles.size(size),
        {
          'text-mauve-300 bg-gray-900': state === 'active',
          'cursor-pointer': !['disabled', 'loading', 'error'].includes(state),
          'hover:text-mauve-300 bg-transparent text-gray-100':
            state === 'default',
        },
        className,
      )}>
      <ButtonChildren state={state} {...props}>
        {children}
      </ButtonChildren>
    </UIButton>
  );
};

export const OutlinedButton = ({
  size,
  children,
  className,
  state = 'default',
  onClick,
  ...props
}: Omit<Props, 'variant'>) => {
  return (
    <UIButton
      onClick={onClick}
      className={cn(
        styles.common,
        styles.size(size),
        'cursor-pointer border-[1px] border-white/40 text-[#EBEDF5]',
        className,
      )}>
      <ButtonChildren state={state} {...props}>
        {children}
      </ButtonChildren>
    </UIButton>
  );
};

export const Button = ({ variant, ...restProps }: Props) => {
  switch (variant) {
    case 'tertiary':
      return <ButtonTertiary {...restProps} />;
    case 'primary':
    default:
      return <ButtonPrimary {...restProps} />;
  }
};
