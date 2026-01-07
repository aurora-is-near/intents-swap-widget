import { Button as UIButton } from '@headlessui/react';
import { ProgressActivityW700 as ProgressActivity } from '@material-symbols-svg/react-rounded/icons/progress-activity';
import type {
  IconProps,
  MaterialSymbolsComponent,
} from '@material-symbols-svg/react';

import { cn as clsx } from '@/utils/cn';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'primary' | 'outlined';
type State = 'default' | 'loading' | 'disabled' | 'active' | 'error';

type Props = {
  size: Size;
  state?: State;
  variant: Variant;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  fluid?: boolean;
} & (
  | { icon: MaterialSymbolsComponent; iconPosition?: 'head' | 'tail' }
  | { icon?: never; iconPosition?: never }
);

const styles = {
  icon: 'h-sw-xl w-sw-xl',

  size: (size: Size) => ({
    'px-sw-xl py-sw-[10px] rounded-sw-sm': size === 'sm',
    'px-sw-2xl py-sw-sm rounded-sw-md': size === 'md',
    'px-sw-3xl py-sw-xl rounded-sw-lg': size === 'lg',
  }),

  width: (fluid?: boolean) => ({
    'w-full': !fluid,
  }),

  common: `
    ring-1 ring-inset ring-transparent
    transition-all duration-250 ease-in-out
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
      : ({ className, ...iconProps }: IconProps) => (
          <ProgressActivity
            className={clsx(styles.icon, 'animate-spin', className)}
            {...iconProps}
          />
        );

  return (
    <span className="text-sw-label-md flex w-full items-center justify-center gap-sw-lg py-sw-xs">
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
  onClick,
  fluid,
  ...props
}: Omit<Props, 'variant'>) => {
  const isDisabled = ['disabled', 'loading', 'error'].includes(state)
    ? true
    : undefined;

  return (
    <UIButton
      disabled={isDisabled}
      data-active={state === 'active' ? true : undefined}
      onClick={() => state === 'default' && onClick?.()}
      className={clsx(
        styles.common,
        styles.width(fluid),
        styles.size(size),
        {
          'bg-transparent text-sw-status-error ring-1 ring-inset ring-sw-status-error':
            state === 'error',
          'bg-transparent text-sw-gray-400 ring-1 ring-inset ring-sw-gray-700':
            state === 'loading' || state === 'disabled',
          'text-sw-gray-950 bg-sw-accent-500 hover:bg-sw-accent-400 cursor-pointer':
            ['active', 'default'].includes(state),
        },
        className,
      )}>
      <ButtonChildren state={state} {...props}>
        {children}
      </ButtonChildren>
    </UIButton>
  );
};

const ButtonOutlined = ({
  size,
  className,
  children,
  state = 'default',
  onClick,
  fluid,
  ...props
}: Omit<Props, 'variant'>) => {
  const isDisabled = ['disabled', 'loading', 'error'].includes(state)
    ? true
    : undefined;

  return (
    <UIButton
      disabled={isDisabled}
      data-active={state === 'active' ? true : undefined}
      onClick={() => state === 'default' && onClick?.()}
      className={clsx(
        styles.common,
        styles.width(fluid),
        styles.size(size),
        {
          'bg-transparent text-sw-status-error ring-1 ring-inset ring-sw-status-error':
            state === 'error',
          'bg-transparent text-sw-gray-400 ring-1 ring-inset ring-sw-gray-700':
            state === 'loading' || state === 'disabled',
          'bg-transparent text-sw-gray-50 ring-1 ring-inset ring-sw-gray-600 hover:ring-sw-gray-100 cursor-pointer':
            ['active', 'default'].includes(state),
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
    case 'outlined':
      return <ButtonOutlined {...restProps} />;
    case 'primary':
    default:
      return <ButtonPrimary {...restProps} />;
  }
};
