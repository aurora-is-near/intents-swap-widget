import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import {
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
} from 'react';

import { cn } from '../../utils/cn';
import { Button } from '../Button/Button';
import { CloseIcon } from '../icons/icons';
import { ScrollArea } from '../ScrollArea/ScrollArea';

/*
 * The confirm modal (Web-Borrow.dc.html lines 967–983). Mobile is an
 * edge-to-edge bottom sheet, as approved in the plan review. The mobile
 * artboard (Mob-Borrow-Confirm.dc.html lines 967–968) has the same markup as
 * desktop and no modal rule in its `@media (max-width:640px)` block, so the
 * sheet keeps the desktop popup's radius, padding and shadow, and its height
 * cap leaves the artboard's 20px gutter of backdrop above it.
 *
 * `mobile:` (theme.css) is the artboards' breakpoint exactly;
 * Tailwind's `max-sm:` is `width < 640px` and would miss 640 itself.
 */

/**
 * Whether the dialog shows its close button, which the title and
 * description keep clear of.
 */
const CloseButtonContext = createContext(true);

export type DialogProps = Omit<
  DialogPrimitive.Root.Props,
  'children' | 'disablePointerDismissal' | 'handle'
> & {
  children?: ReactNode;
  /**
   * Whether Escape, an outside press and the close button close the dialog.
   * When `false` (such as while a transaction is being signed) there is no
   * close button and only the app closes it, through `open`. Defaults to
   * `true`.
   */
  dismissible?: boolean;
  /**
   * Whether the popup shows its close button. Defaults to `dismissible`. A
   * dismissible dialog without one (such as a success message the artboard
   * draws with no close button, Web-Borrow-Done.dc.html lines 970–976) still
   * closes on Escape and an outside press.
   */
  closeButton?: boolean;
};

/**
 * A modal dialog on Base UI `Dialog`. Uncontrolled with `defaultOpen`, or
 * controlled with `open` and `onOpenChange`. Holds a `DialogContent`.
 */
export function Dialog({
  dismissible = true,
  closeButton = dismissible,
  onOpenChange,
  children,
  ...props
}: DialogProps) {
  return (
    <CloseButtonContext.Provider value={closeButton}>
      <DialogPrimitive.Root
        {...props}
        disablePointerDismissal={!dismissible}
        onOpenChange={(open, eventDetails) => {
          // `disablePointerDismissal` already stops outside presses and focus
          // moving out; Escape is the one dismissal left to refuse.
          if (!open && !dismissible && eventDetails.reason === 'escape-key') {
            eventDetails.cancel();

            return;
          }

          onOpenChange?.(open, eventDetails);
        }}>
        {children}
      </DialogPrimitive.Root>
    </CloseButtonContext.Provider>
  );
}

export type DialogContentProps = Omit<
  ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>,
  'className'
> & {
  className?: string;
};

/**
 * The portalled backdrop, scroll viewport and popup (role `dialog`, named by
 * its `DialogTitle`). Centred, at most 460px wide; at 640px or narrower a
 * full-width sheet pinned to the bottom. Shows the close button unless the
 * dialog's `closeButton` is off (by default, when it is not `dismissible`).
 *
 * Portals render into `<body>`: the app's root needs `isolation: isolate`
 * so the dialog stacks above it (see `styles/index.css`).
 */
export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const closeButton = useContext(CloseButtonContext);

    return (
      <DialogPrimitive.Portal>
        {/*
          The backdrop (line 967): the light ink in both themes on the
          artboards. No z-index on it or the viewport (the artboard's is
          `z-index:100`): with the app root isolated, portalled layers stack
          above the app in DOM order, so a popup opened from inside the
          dialog, such as a `TokenSelect`, lands on top of it.
        */}
        <DialogPrimitive.Backdrop className="fixed inset-0 bg-scrim transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        {/* The scroll container (line 967) centres the popup with its
            `margin:auto`; mobile drops the 20px gutter. */}
        <DialogPrimitive.Viewport className="fixed inset-0 box-border flex overflow-y-auto p-5 mobile:p-0">
          {/*
            The popup (line 968). The close button is positioned against it;
            its 26px padding is on the content's scroll area, so a tall
            dialog scrolls inside the popup with the close button pinned
            above. Mobile: full width, pinned to the bottom, top corners
            rounded. Desktop fades and scales from .96; the sheet slides up;
            both are off under `prefers-reduced-motion`.
          */}
          <DialogPrimitive.Popup
            ref={ref}
            className={cn(
              'relative m-auto box-border min-w-0 flex-[0_1_460px] rounded-28 bg-sf font-sans text-ink shadow-dialog outline-none',
              'transition-[opacity,scale,translate] duration-200 data-ending-style:scale-96 data-ending-style:opacity-0 data-starting-style:scale-96 data-starting-style:opacity-0 motion-reduce:transition-none',
              'mobile:mx-0 mobile:mt-auto mobile:mb-0 mobile:basis-full mobile:rounded-t-28 mobile:rounded-b-none',
              'mobile:data-ending-style:translate-y-full mobile:data-ending-style:scale-100 mobile:data-ending-style:opacity-100 mobile:data-starting-style:translate-y-full mobile:data-starting-style:scale-100 mobile:data-starting-style:opacity-100',
              className,
            )}
            {...props}>
            {/* `.ibtn` (lines 53–54): the `ghost` button without its padding,
                at the popup's top-right padding corner, above the scrolling
                content (`z-1`). Rendered before the children (the artboard
                has it after the title, line 982) so that it is the first
                focusable element and takes the initial focus rather than the
                dialog's main action. */}
            {closeButton ? (
              <DialogPrimitive.Close
                aria-label="Close"
                render={
                  <Button
                    className="absolute top-6.5 right-6.5 z-1 h-9 w-9 p-0 text-ink"
                    variant="ghost"
                  />
                }>
                <CloseIcon />
              </DialogPrimitive.Close>
            ) : null}
            {/*
              The content scrolls inside the popup, in the kit's ScrollArea,
              with the popup's 26px padding (line 968). At most the screen
              height less the backdrop's 20px gutter on each side (on mobile,
              less the 20px gutter above the sheet), and the sheet's bottom
              padding clears the home indicator. The scrollbar runs in the
              right padding, 6px from the edge, and stops short of the 28px
              corners.
            */}
            <ScrollArea
              className="rounded-[inherit]"
              scrollbarClassName="my-7 mr-1.5"
              viewportClassName="max-h-[calc(100dvh_-_40px)] rounded-[inherit] p-6.5 mobile:max-h-[calc(100dvh_-_20px)] mobile:pb-[calc(26px_+_env(safe-area-inset-bottom))]">
              {children}
            </ScrollArea>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    );
  },
);

DialogContent.displayName = 'DialogContent';

export type DialogTitleProps = Omit<
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>,
  'className'
> & {
  className?: string;
};

/**
 * The dialog's `<h2>` heading; it names the dialog (line 981). With a close
 * button, `pr-12` keeps it clear of the button's 36px plus the header row's
 * 12px gap.
 */
export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => {
    const closeButton = useContext(CloseButtonContext);

    return (
      <DialogPrimitive.Title
        ref={ref}
        className={cn(
          'm-0 text-26 font-extrabold leading-font tracking-title',
          closeButton && 'pr-12',
          className,
        )}
        {...props}
      />
    );
  },
);

DialogTitle.displayName = 'DialogTitle';

export type DialogDescriptionProps = Omit<
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>,
  'className'
> & {
  className?: string;
};

/**
 * The line under the title (line 981); it describes the dialog. Clear of the
 * close button as `DialogTitle` is.
 */
export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(({ className, ...props }, ref) => {
  const closeButton = useContext(CloseButtonContext);

  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn(
        'mx-0 mt-1.5 mb-0 text-15 leading-font text-mut',
        closeButton && 'pr-12',
        className,
      )}
      {...props}
    />
  );
});

DialogDescription.displayName = 'DialogDescription';
