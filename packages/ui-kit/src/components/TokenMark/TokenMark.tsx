import { forwardRef, type HTMLAttributes } from 'react';

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
  /** A logo to show instead of the letters. */
  src?: string;
  /** The logo's alt text; defaults to `label`. */
  alt?: string;
};

/** The round token letter mark (Web-Borrow.dc.html line 220). */
export const TokenMark = forwardRef<HTMLSpanElement, TokenMarkProps>(
  ({ label, bg, fg, size = 38, src, alt, className, style, ...props }, ref) => (
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
      {src ? (
        <img
          alt={alt ?? label}
          className="h-full w-full object-cover"
          height={size}
          src={src}
          width={size}
        />
      ) : (
        label
      )}
    </span>
  ),
);

TokenMark.displayName = 'TokenMark';
