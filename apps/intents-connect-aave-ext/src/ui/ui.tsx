import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  forwardRef,
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import { useAnnounce } from './a11y/Announcer';

/** The current time, ticking every second while `enabled`. */
export const useNow = (enabled: boolean) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timer);
  }, [enabled]);

  return now;
};

export const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ');

const BUTTON_VARIANTS = {
  /** The dialog's main action: full height, black, like Aave's own. */
  primary:
    'h-12 rounded-cta bg-cta px-6 text-button font-medium text-cta-text shadow-cta hover:bg-cta-hover disabled:bg-cta-disabled disabled:shadow-none',
  secondary:
    'h-9 rounded-control bg-control px-3.5 text-sm font-medium text-text-primary shadow-box hover:bg-surface-hover disabled:opacity-50',
  /** Icon buttons: at least 24 px square, the WCAG 2.2 minimum target. */
  ghost:
    'min-h-[24px] min-w-[24px] rounded-chip p-1 text-text-muted hover:text-text-primary disabled:opacity-40',
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
  warning: 'bg-danger-bg shadow-danger',
} as const;

export const Notice = ({
  tone,
  children,
}: {
  tone: keyof typeof NOTICE_TONES;
  children: ReactNode;
}) => (
  <div className={cx('rounded-card p-3', NOTICE_TONES[tone])}>{children}</div>
);

/** `0xd8dA…6045` */
export const truncateMiddle = (value: string, head = 6, tail = 4) =>
  value.length > head + tail + 1
    ? `${value.slice(0, head)}…${value.slice(-tail)}`
    : value;

export const Skeleton = ({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) => (
  <div
    aria-hidden="true"
    className={cx('animate-pulse rounded-card bg-surface-hover', className)}
    style={style}
  />
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
export const CheckIcon = ({ size = 14 }: { size?: number }) =>
  icon(<path d="M20 6 9 17l-5-5" />, size);
export const QrIcon = ({ size = 16 }: { size?: number }) =>
  icon(
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
    </>,
    size,
  );
export const BrowserIcon = ({ size = 16 }: { size?: number }) =>
  icon(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M7 6.5h.01M10 6.5h.01" />
    </>,
    size,
  );
export const SearchIcon = ({ size = 14 }: { size?: number }) =>
  icon(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>,
    size,
  );
export const WalletGlyph = ({ size = 18 }: { size?: number }) =>
  icon(
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18M16 15h2M7 6V4.5A1.5 1.5 0 0 1 8.5 3H17" />
    </>,
    size,
  );

const CopyIcon = () =>
  icon(
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>,
    12,
  );

/**
 * Copies `value`: the icon turns into a check for a moment, and screen
 * readers hear that it was copied (or that it couldn't be).
 */
export const CopyButton = ({
  value,
  label,
}: {
  value: string;
  /** What is copied, for screen readers. */
  label: string;
}) => {
  const [copied, setCopied] = useState(false);
  const announce = useAnnounce();

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
      aria-label={`Copy ${label}`}
      onClick={() => {
        navigator.clipboard.writeText(value).then(
          () => {
            setCopied(true);
            announce(`Copied the ${label}`);
          },
          () => announce(`Couldn't copy the ${label}`, 'assertive'),
        );
      }}>
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
};

/** A small grey label: a wallet family, "Phone", "On Aave". */
export const Tag = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex h-5 items-center rounded-chip bg-surface-hover px-1.5 text-xs font-medium text-text-secondary">
    {children}
  </span>
);
