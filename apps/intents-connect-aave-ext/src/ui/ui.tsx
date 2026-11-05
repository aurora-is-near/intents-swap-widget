import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';

const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ');

const BUTTON_VARIANTS = {
  /** The dialog's main action: full height, black, like Aave's own. */
  primary:
    'h-12 rounded-[10px] bg-cta px-6 text-[15px] font-medium text-cta-text shadow-[0_2px_4px_rgba(0,0,0,0.03),0_0_0_1px_var(--cta)] hover:bg-cta-hover disabled:bg-cta-disabled disabled:shadow-none',
  secondary:
    'h-9 rounded-lg bg-white px-3.5 text-sm font-medium text-text-primary shadow-box hover:bg-surface-hover disabled:opacity-50',
  /** Icon buttons. */
  ghost:
    'rounded-md p-1 text-text-muted hover:text-text-primary disabled:opacity-40',
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANTS;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'secondary', className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 transition-colors duration-150 disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant],
        className,
      )}>
      {children}
    </button>
  ),
);

Button.displayName = 'Button';

const NOTICE_TONES = {
  info: 'bg-surface-raised shadow-box',
  warning: 'bg-[#fff5f0] shadow-[0_0_0_1px_rgba(235,66,0,0.18)]',
} as const;

export const Notice = ({
  tone,
  children,
}: {
  tone: keyof typeof NOTICE_TONES;
  children: ReactNode;
}) => (
  <div className={cx('rounded-xl p-3', NOTICE_TONES[tone])}>{children}</div>
);

/** `0xd8dA…6045` */
export const truncateMiddle = (value: string, head = 6, tail = 4) =>
  value.length > head + tail + 1
    ? `${value.slice(0, head)}…${value.slice(-tail)}`
    : value;
