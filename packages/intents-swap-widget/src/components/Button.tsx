import { Button as UIButton } from '@headlessui/react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import * as Icons from 'lucide-react';

import { cn as clsx } from '@/utils/cn';

type Size = 'md' | 'lg';
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
} & (
  | { icon: LucideIcon; iconPosition?: 'head' | 'tail' }
  | { icon?: never; iconPosition?: never }
);

const styles = {
  icon: 'h-sw-xl w-sw-xl',

  size: (size: Size) => ({
    'px-sw-2xl py-sw-lg': size === 'md',
    'px-sw-3xl py-sw-xl': size === 'lg',
  }),

  state: (state: State) => ({
    'bg-transparent text-sw-mauve-400 ring-1 ring-inset ring-sw-mauve-700':
      state === 'disabled',
    'bg-sw-mauve-700 text-sw-mauve-300': state === 'loading',
    'bg-sw-alert-900 text-sw-alert-100': state === 'error',
    'text-sw-mauve-975 bg-sw-mauve-300 hover:bg-sw-mauve-50': [
      'active',
      'default',
    ].includes(state),
  }),

  common: `
    ring-1 ring-inset ring-transparent
    transition-colors duration-250 ease-in-out
    w-full rounded-sw-md
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
    <span className="text-sw-label-m flex w-full items-center justify-center gap-sw-lg">
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
  ...props
}: Omit<Props, 'variant'>) => {
  return (
    <UIButton
      onClick={() => state === 'default' && onClick?.()}
      className={clsx(
        styles.common,
        styles.size(size),
        styles.state(state),
        {
          'cursor-pointer': !['disabled', 'loading', 'error'].includes(state),
          'bg-sw-gray-700': detail === 'dimmed',
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
  ...props
}: Omit<Props, 'variant'>) => {
  return (
    <UIButton
      onClick={() => state === 'default' && onClick?.()}
      className={clsx(
        styles.common,
        styles.size(size),
        {
          'text-sw-gray-50': state === 'active',
          'bg-sw-gray-700': detail === 'dimmed' && state === 'active',
          'bg-sw-gray-900': detail !== 'dimmed' && state === 'active',
          'cursor-pointer': !['disabled', 'loading', 'error'].includes(state),
          'hover:text-sw-mauve-300 bg-transparent text-sw-gray-100':
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
      onClick={() => state === 'default' && onClick?.()}
      className={clsx(
        styles.common,
        styles.size(size),
        'ring-1 ring-sw-gray-500 text-sw-gray-50',
        {
          'cursor-pointer hover:text-sw-mauve-300 bg-transparent':
            state === 'default',
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
