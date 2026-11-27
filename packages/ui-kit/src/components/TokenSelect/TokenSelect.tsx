import { Popover } from '@base-ui/react/popover';
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type ReactNode,
  type RefObject,
  useState,
} from 'react';

import { cn } from '../../utils/cn';
import { ChevronIcon } from '../icons/icons';
import { TokenMark } from '../TokenMark/TokenMark';
import { TokenList, type TokenOption, TokenRow } from '../TokenList/TokenList';

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
   * trigger. The popup is never narrower than 288px (a row needs that room)
   * nor wider than the space beside it.
   */
  anchor?: RefObject<Element | null>;
  /** Shown in place of the list when there are no options. */
  emptyLabel?: ReactNode;
  /** Names the popup (a dialog), such as "Choose collateral token". */
  'aria-label': string;
};

/**
 * A token picker: a `.pick` trigger that opens a `.panel` popover with
 * optional filter chips and a list of token rows. The rows are plain
 * buttons reached with Tab (not a listbox). Picking one calls
 * `onValueChange`, closes the popup and returns focus to the trigger;
 * Escape and an outside press close it too.
 *
 * The trigger is `.pick` (Web-Borrow.dc.html lines 23–25, markup line 219);
 * open (`.pick.open`, Base UI's `data-popup-open`) it has a 2px ink ring.
 * Disabled: `.go:disabled`'s opacity (line 57) and the not-allowed cursor
 * (line 16), with no hover, as Button. The artboard sets the width (188px)
 * where the trigger is placed: pass it as `className`.
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
      emptyLabel = 'No tokens match these filters',
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
          className={cn(
            'box-border flex min-w-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 items-center gap-2.5 rounded-14 border-1.5 border-solid border-bd2 bg-sf py-2 pr-3 pl-2 text-left font-sans text-ink enabled:hover:border-ink data-popup-open:border-ink data-popup-open:shadow-ink-ring focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid',
            className,
          )}
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
          {/* Symbol and chain (line 221). */}
          <span className="min-w-0 flex-1 leading-1.2">
            <span className="block text-18 font-bold">{selected.symbol}</span>
            <span className="flex items-center gap-1.25 text-12 text-mut">
              {/* The 7px chain dot, as Chip's (line 221). */}
              {selected.chainColor ? (
                <span
                  aria-hidden="true"
                  className="inline-block size-1.75 shrink-0 rounded-full"
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
            {/*
              `.panel` (line 32): as wide as the anchor wrapper (`left:0;
              right:0` on the artboard), but at least 288px (18rem) so a row
              keeps room for its name beside a price or balance, and never
              wider than the space Base UI reports (`--available-width`).
              8px below the anchor, border 1.5px ink,
              radius 18, padding 12, `sf`. The shadow's rgba is the light ink
              (#111613) in both themes on the artboards, so it stays literal.

              No z-index: the artboard's `z-index:20` lifted an in-flow
              `.panel` over the card. The popup is portalled, so like the
              kit's other portalled layers it stacks in DOM order above the
              app root, which needs `isolation: isolate`.

              It scales out of the trigger (`--transform-origin`) and back
              into it, 200ms in and 150ms out; under reduced motion it only
              fades.
            */}
            <Popover.Popup
              aria-label={ariaLabel}
              className="box-border w-[min(max(var(--anchor-width),18rem),var(--available-width))] origin-(--transform-origin) rounded-18 border-1.5 border-solid border-ink bg-sf p-3 font-sans text-ink shadow-popup outline-none transition-[opacity,scale] duration-200 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
              {filters}
              {/* `.list` (line 33): 10px below the filter chips. */}
              {options.length === 0 ? (
                <p
                  className={cn(
                    'm-0 px-2.5 py-2 text-14 text-mut',
                    filters != null && 'mt-2.5',
                  )}>
                  {emptyLabel}
                </p>
              ) : (
                <TokenList className={cn(filters != null && 'mt-2.5')}>
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
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    );
  },
);

TokenSelect.displayName = 'TokenSelect';
