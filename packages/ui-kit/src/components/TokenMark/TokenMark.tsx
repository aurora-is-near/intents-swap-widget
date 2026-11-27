import { forwardRef, type HTMLAttributes, useState } from 'react';

import { cn } from '../../utils/cn';

export type TokenMarkProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children'
> & {
  /** The letters shown in the circle, such as "ET". */
  label: string;
  /** Background colour; the per-token palette is app data. */
  bg?: string;
  /** Text colour. */
  fg?: string;
  /** Diameter in px. */
  size?: number;
  /** A logo to show instead of the letters; the letters stay if it fails. */
  src?: string;
  /** The logo's alt text; defaults to `label`. */
  alt?: string;
};

/** The round token letter mark (Web-Borrow.dc.html line 220). */
export const TokenMark = forwardRef<HTMLSpanElement, TokenMarkProps>(
  ({ label, bg, fg, size = 38, src, alt, className, style, ...props }, ref) => {
    // The logo that failed to load, so a new `src` gets its own try.
    const [failedSrc, setFailedSrc] = useState<string>();
    const logo = src !== undefined && src !== failedSrc ? src : undefined;

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-14 font-extrabold',
          className,
        )}
        style={{
          width: size,
          height: size,
          background: bg,
          color: fg,
          ...style,
        }}
        {...props}>
        {logo ? (
          <img
            alt={alt ?? label}
            className="h-full w-full object-cover"
            height={size}
            onError={() => setFailedSrc(logo)}
            src={logo}
            width={size}
          />
        ) : (
          label
        )}
      </span>
    );
  },
);

TokenMark.displayName = 'TokenMark';
