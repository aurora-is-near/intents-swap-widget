import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../lib/cn';

/** `.stag` (Web-Borrow.dc.html line 154). */
const BASE =
  'inline-flex items-center gap-[6px] whitespace-nowrap rounded-full px-[10px] py-[3px] text-[12px] font-bold';

/**
 * The artboard fills a tag from its script data (`tagBg`/`tagFg`, line 385):
 * "At risk" is negbg/neg, "Active" and "Repaid" are tint/pos, "Closed" is
 * sf2/mut. `warn` uses the warning pair of tokens.
 */
const TONE_CLASSES = {
  risk: 'bg-negbg text-neg',
  warn: 'bg-warnbg text-warn',
  positive: 'bg-tint text-pos',
  neutral: 'bg-sf2 text-mut',
} as const;

export type TagTone = keyof typeof TONE_CLASSES;

export type TagProps = HTMLAttributes<HTMLSpanElement> & {
  tone: TagTone;
};

export const Tag = forwardRef<HTMLSpanElement, TagProps>(
  ({ tone, className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(BASE, TONE_CLASSES[tone], className)}
      {...props}
    />
  ),
);

Tag.displayName = 'Tag';
