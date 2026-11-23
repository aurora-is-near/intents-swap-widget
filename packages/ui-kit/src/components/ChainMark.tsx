import {
  Children,
  cloneElement,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
} from 'react';

import { cn } from '../lib/cn';

/**
 * The two ringed sizes in Web-Borrow.dc.html: 26px on a `--sf` surface with
 * 9px text and an 8px overlap (line 741), 32px on `--sf2` with 10px text and
 * a 10px overlap (line 826).
 */
const SIZE_CLASSES = {
  26: { mark: 'h-[26px] w-[26px] border-sf text-[9px]', overlap: '-ml-[8px]' },
  32: {
    mark: 'h-[32px] w-[32px] border-sf2 text-[10px]',
    overlap: '-ml-[10px]',
  },
} as const;

export type ChainMarkSize = keyof typeof SIZE_CLASSES;

export type ChainMarkProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children'
> & {
  /** The letters shown in the circle, such as "BT". */
  label: string;
  /** Background colour; the per-chain palette is app data. */
  bg?: string;
  /** Text colour. */
  fg?: string;
  /** Diameter in px: 26 (ring `--sf`) or 32 (ring `--sf2`). */
  size?: ChainMarkSize;
  /** Overrides the ring colour, for a mark on another surface. */
  ringColor?: string;
  /** A logo to show instead of the letters. */
  src?: string;
  /** The logo's alt text; defaults to `label`. */
  alt?: string;
};

/** A small chain or market mark with a ring that cuts it from its neighbour. */
export const ChainMark = forwardRef<HTMLSpanElement, ChainMarkProps>(
  (
    {
      label,
      bg,
      fg,
      size = 26,
      ringColor,
      src,
      alt,
      className,
      style,
      ...props
    },
    ref,
  ) => (
    <span
      ref={ref}
      className={cn(
        'box-border inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-solid font-extrabold',
        SIZE_CLASSES[size].mark,
        className,
      )}
      style={{ background: bg, color: fg, borderColor: ringColor, ...style }}
      {...props}>
      {src ? (
        <img
          alt={alt ?? label}
          className="h-full w-full object-cover"
          src={src}
        />
      ) : (
        label
      )}
    </span>
  ),
);

ChainMark.displayName = 'ChainMark';

export type ChainMarkGroupProps = HTMLAttributes<HTMLSpanElement> & {
  /** The size of every mark in the group; a mark's own `size` wins. */
  size?: ChainMarkSize;
  children?: ReactNode;
};

/** A row of chain marks, each after the first overlapping the one before. */
export const ChainMarkGroup = forwardRef<HTMLSpanElement, ChainMarkGroupProps>(
  ({ size = 26, className, children, ...props }, ref) => {
    let index = 0;

    return (
      <span
        ref={ref}
        className={cn('inline-flex items-center', className)}
        {...props}>
        {Children.map(children, (child) => {
          // Only marks get a size and an overlap; anything else (a "+2"
          // label, a Fragment) passes through untouched.
          if (
            !isValidElement<ChainMarkProps>(child) ||
            child.type !== ChainMark
          ) {
            return child;
          }

          const mark = child;
          const markSize = mark.props.size ?? size;
          const isFirst = index === 0;

          index += 1;

          return cloneElement(mark, {
            size: markSize,
            className: cn(
              !isFirst && SIZE_CLASSES[markSize].overlap,
              mark.props.className,
            ),
          });
        })}
      </span>
    );
  },
);

ChainMarkGroup.displayName = 'ChainMarkGroup';
