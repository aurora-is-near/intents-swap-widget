import { Popover } from '@base-ui/react/popover';
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type ReactNode,
  type RefObject,
  useState,
} from 'react';

import { cn } from '../lib/cn';
import { FOCUS_RING } from '../lib/focusRing';
import { DOT } from './Chip';
import { ChevronIcon } from './icons';
import { TokenMark } from './TokenMark';
import { TokenList, type TokenOption, TokenRow } from './TokenList';

/**
 * `.pick` (Web-Borrow.dc.html lines 23–25, markup line 219): gap 10, padding
 * 8px 12px 8px 8px, radius 14, border 1.5px `bd2`, `sf`; hover border ink;
 * open (`.pick.open`, Base UI's `data-popup-open`) border ink with a 2px ink
 * ring. Focus ring as on line 20. Disabled: `.go:disabled`'s opacity (line
 * 57) and the not-allowed cursor (line 16), with no hover, as Button. The
 * artboard sets the width (188px) where the trigger is placed: pass it as
 * `className`.
 */
const TRIGGER = `box-border flex min-w-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 items-center gap-[10px] rounded-[14px] border-[1.5px] border-solid border-bd2 bg-sf py-[8px] pr-[12px] pl-[8px] text-left font-sans text-ink enabled:hover:border-ink data-popup-open:border-ink data-popup-open:shadow-[0_0_0_2px_var(--ink)] ${FOCUS_RING}`;

/** Symbol and chain (line 221): `flex:1; min-width:0; line-height:1.2`. */
const TRIGGER_NAMES = 'min-w-0 flex-1 leading-[1.2]';

/** Line 221: 18px / 700. */
const TRIGGER_SYMBOL = 'block text-[18px] font-bold';

/** Line 221: chain dot and name, gap 5, 12px `mut`. */
const TRIGGER_CHAIN = 'flex items-center gap-[5px] text-[12px] text-mut';

/**
 * `.panel` (line 32): as wide as the anchor wrapper (`left:0; right:0` on
 * the artboard), 8px below it, border 1.5px ink, radius 18, padding 12,
 * `sf`. The shadow's rgba is the light ink (#111613) in both themes on the
 * artboards, so it stays literal.
 *
 * No z-index: the artboard's `z-index:20` lifted an in-flow `.panel` over
 * the card. The popup is portalled, so like the kit's other portalled
 * layers it stacks in DOM order above the app root, which needs
 * `isolation: isolate`.
 */
const POPUP =
  'box-border w-[var(--anchor-width)] rounded-[18px] border-[1.5px] border-solid border-ink bg-sf p-[12px] font-sans text-ink shadow-[0_18px_40px_rgba(17,22,19,0.18)] outline-none';

/** `.list` (line 33): 10px below the filter chips. */
const LIST_AFTER_FILTERS = 'mt-[10px]';

/** What the trigger shows for the chosen token. */
export type TokenSelectDisplay = {
  symbol: string;
  mark: TokenOption['mark'];
  /** Such as `Ethereum`. */
  chainName: string;
  /** The chain dot's colour. */
  chainColor?: string;
};

export type TokenSelectProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'children' | 'aria-label'
> & {
  /** The chosen option's id; its row is marked. */
  value?: string;
  /** Called with the picked option's id. The popup then closes. */
  onValueChange: (value: string) => void;
  options: readonly TokenOption[];
  /** Display data for the trigger. */
  selected: TokenSelectDisplay;
  /** Rows of `Chip`s shown above the list, such as group and chain filters. */
  filters?: ReactNode;
  /**
   * The element the popup lines up with and takes its width from, such as
   * the row holding the trigger and the amount field. Defaults to the
   * trigger.
   */
  anchor?: RefObject<Element | null>;
  /** Names the popup (a dialog), such as "Choose collateral token". */
  'aria-label': string;
};

/**
 * A token picker: a `.pick` trigger that opens a `.panel` popover with
 * optional filter chips and a list of token rows. The rows are plain
 * buttons reached with Tab (not a listbox). Picking one calls
 * `onValueChange`, closes the popup and returns focus to the trigger;
 * Escape and an outside press close it too.
 */
export const TokenSelect = forwardRef<HTMLButtonElement, TokenSelectProps>(
  (
    {
      value,
      onValueChange,
      options,
      selected,
      filters,
      anchor,
      'aria-label': ariaLabel,
      className,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);

    return (
      <Popover.Root onOpenChange={setOpen} open={open}>
        <Popover.Trigger
          ref={ref}
          className={cn(TRIGGER, className)}
          {...props}>
          {/* Line 220: 38px, letters 14px / 800. */}
          <TokenMark
            alt=""
            aria-hidden="true"
            bg={selected.mark.bg}
            fg={selected.mark.fg}
            label={selected.mark.label}
            size={38}
            src={selected.mark.src}
          />
          <span className={TRIGGER_NAMES}>
            <span className={TRIGGER_SYMBOL}>{selected.symbol}</span>
            <span className={TRIGGER_CHAIN}>
              {selected.chainColor ? (
                <span
                  aria-hidden="true"
                  className={DOT}
                  style={{ background: selected.chainColor }}
                />
              ) : null}
              {selected.chainName}
            </span>
          </span>
          <ChevronIcon className="shrink-0" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            align="start"
            anchor={anchor}
            side="bottom"
            sideOffset={8}>
            <Popover.Popup aria-label={ariaLabel} className={POPUP}>
              {filters}
              <TokenList className={cn(filters != null && LIST_AFTER_FILTERS)}>
                {options.map((option) => (
                  <TokenRow
                    key={option.id}
                    onClick={() => {
                      onValueChange(option.id);
                      setOpen(false);
                    }}
                    option={option}
                    selected={option.id === value}
                  />
                ))}
              </TokenList>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    );
  },
);

TokenSelect.displayName = 'TokenSelect';
