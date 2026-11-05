import {
  type ButtonHTMLAttributes,
  forwardRef,
  type ReactNode,
  useEffect,
  useState,
} from 'react';

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

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cx('animate-pulse rounded-xl bg-surface-hover', className)} />
);

const icon = (path: ReactNode, size = 14) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden>
    {path}
  </svg>
);

export const CloseIcon = () => icon(<path d="M6 6l12 12M18 6 6 18" />);
export const BackIcon = () => icon(<path d="m15 18-6-6 6-6" />, 16);
export const ChevronIcon = () => icon(<path d="m9 18 6-6-6-6" />, 16);
export const CheckIcon = () => icon(<path d="M20 6 9 17l-5-5" />);
const CopyIcon = () =>
  icon(
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>,
    12,
  );

/** Copies `value`; the icon turns into a check for a moment. */
export const CopyButton = ({
  value,
  label,
}: {
  value: string;
  /** What is copied, for screen readers. */
  label: string;
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timer = setTimeout(() => setCopied(false), 1500);

    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      variant="ghost"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      onClick={() => {
        navigator.clipboard.writeText(value).then(
          () => setCopied(true),
          () => undefined,
        );
      }}>
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
};

/** A small grey label: a wallet family, "Phone", "On Aave". */
export const Tag = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex h-5 items-center rounded-md bg-surface-hover px-1.5 text-xs font-medium text-text-secondary">
    {children}
  </span>
);
