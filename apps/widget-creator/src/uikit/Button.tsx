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
    'px-csw-lg py-csw-md text-sm': size === 'sm',
    'px-csw-2xl py-csw-lg': size === 'md',
    'px-csw-3xl py-csw-xl': size === 'lg',
  }),

  state: (state: State) => ({
    'bg-transparent text-csw-gray-50 ring-1 ring-inset ring-csw-gray-50':
      state === 'disabled',
    'bg-csw-gray-700 text-csw-gray-300': state === 'loading',
    'bg-csw-alert-900 text-csw-alert-100': state === 'error',
    'text-csw-gray-950 bg-csw-gray-50 hover:bg-csw-gray-400': [
      'active',
      'default',
    ].includes(state),
  }),

  width: (fluid?: boolean) => ({
    'w-full': !fluid,
  }),

  common: `
    transition-colors duration-200 ease-in-out
    rounded-csw-md
    select-none
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
    <span className="flex w-full items-center justify-center gap-csw-md">
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
      disabled={['disabled', 'loading'].includes(state)}
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
      disabled={['disabled', 'loading'].includes(state)}
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
          'hover:text-csw-gray-50 bg-transparent text-csw-gray-100':
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
      disabled={['disabled', 'loading'].includes(state)}
      onClick={() => state === 'default' && onClick?.()}
      className={clsx(
        styles.common,
        styles.width(fluid),
        styles.size(size),
        'p-csw-sm flex items-center rounded-csw-md cursor-pointer text-csw-gray-50',
        {
          'border-[1.5px] border-csw-gray-300 bg-csw-gray-800':
            state === 'active',
          'border border-csw-gray-700': state === 'default',
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
