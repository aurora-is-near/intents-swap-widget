import { Button as UIButton } from '@headlessui/react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import * as Icons from 'lucide-react';

import { cn as clsx } from '../utils/cn';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'primary' | 'tertiary' | 'outlined';
type State = 'default' | 'loading' | 'disabled' | 'active' | 'error';
type Detail = 'default' | 'dimmed';

type Props = {
  size: Size;
  state?: State;
  detail?: Detail;
  variant: Variant;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  fluid?: boolean;
} & (
  | { icon: LucideIcon; iconPosition?: 'head' | 'tail' }
  | { icon?: never; iconPosition?: never }
);

const styles = {
  icon: 'h-csw-xl w-csw-xl',

  size: (size: Size) => ({
    'px-csw-xl py-csw-2md': size === 'sm',
    'px-csw-2xl py-csw-lg': size === 'md',
    'px-csw-3xl py-csw-xl': size === 'lg',
  }),

  state: (state: State) => ({
    'bg-transparent text-csw-accent-500 ring-1 ring-inset ring-csw-accent-700':
      state === 'disabled',
    'bg-csw-accent-700 text-csw-accent-300': state === 'loading',
    'bg-csw-alert-900 text-csw-alert-100': state === 'error',
    'text-csw-accent-975 bg-csw-accent-500 hover:bg-csw-accent-400': [
      'active',
      'default',
    ].includes(state),
  }),

  width: (fluid?: boolean) => ({
    'w-full': !fluid,
  }),

  common: `
    ring-1 ring-inset ring-transparent
    transition-colors duration-250 ease-in-out
    rounded-csw-md
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
            className={clsx(styles.icon, 'animate-spin', className)}
            {...lucidProps}
          />
        );

  return (
    <span className="text-csw-label-m flex w-full items-center justify-center gap-csw-lg">
      {(hasIcon && iconPosition !== 'tail') ||
      (!hasIcon && state === 'loading') ? (
        <Icon className={styles.icon} />
      ) : null}
      {children}
      {hasIcon && iconPosition === 'tail' && <Icon className={styles.icon} />}
    </span>
  );
};

const ButtonPrimary = ({
  size,
  className,
  children,
  state = 'default',
  detail = 'default',
  onClick,
  fluid,
  ...props
}: Omit<Props, 'variant'>) => {
  return (
    <UIButton
      onClick={() => state === 'default' && onClick?.()}
      className={clsx(
        styles.common,
        styles.width(fluid),
        styles.size(size),
        styles.state(state),
        {
          'cursor-pointer': !['disabled', 'loading', 'error'].includes(state),
          'bg-csw-gray-700': detail === 'dimmed',
        },
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
  detail = 'default',
  onClick,
  fluid,
  ...props
}: Omit<Props, 'variant'>) => {
  return (
    <UIButton
      onClick={() => state === 'default' && onClick?.()}
      className={clsx(
        styles.common,
        styles.width(fluid),
        styles.size(size),
        {
          'text-csw-gray-50': state === 'active',
          'bg-csw-gray-700': detail === 'dimmed' && state === 'active',
          'bg-csw-gray-900': detail !== 'dimmed' && state === 'active',
          'cursor-pointer': !['disabled', 'loading', 'error'].includes(state),
          'hover:text-csw-accent-500 bg-transparent text-csw-gray-100':
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
  fluid,
  ...props
}: Omit<Props, 'variant'>) => {
  return (
    <UIButton
      onClick={() => state === 'default' && onClick?.()}
      className={clsx(
        styles.common,
        styles.width(fluid),
        styles.size(size),
        'hover:bg-csw-gray-800',

        'ring-1 ring-csw-gray-500 text-csw-gray-50',
        {
          'bg-csw-gray-800': state === 'active',
          'cursor-pointer bg-transparent': state === 'default',
          'cursor-not-allowed opacity-50 bg-transparent': state === 'disabled',
        },
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
    case 'outlined':
      return <OutlinedButton {...restProps} />;
    case 'primary':
    default:
      return <ButtonPrimary {...restProps} />;
  }
};
